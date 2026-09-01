// MCP Manager：管理一组 stdio MCP server 子进程
// - 每个 server 由 mcp_servers 表的一行描述（command/args/env）
// - startServer：spawn 子进程 → 连接 StdioClientTransport → 客户端 initialize → listTools → 缓存
// - stopServer：杀掉子进程
// - listToolsForServer：把 MCP tool 转成 AgentTool 形状（name/description/inputSchema）
// - 错误自动回写 mcp_servers.last_error，UI 显示重连按钮
//
// 隔离层在 Electron 主进程；与 v2 引擎（renderer）通过 IPC 解耦

// 前置探测：检查 command 是否在 PATH，并给出常见命令的安装提示
async function checkCommandAvailable(cmd: string): Promise<{ available: boolean; hint: string }> {
  const hints: Record<string, string> = {
    uvx: '需要装 uv（pip 替代品）：irm https://astral.sh/uv/install.ps1 | iex',
    uv: '需要装 uv：irm https://astral.sh/uv/install.ps1 | iex',
    python: '需要装 Python 3.10+',
    python3: '需要装 Python 3.10+',
    pipx: '需要装 pipx',
    docker: '需要装 Docker Desktop',
  }
  // npx / node / npm 一定存在（Electron 自身依赖 Node）
  if (cmd === 'npx' || cmd === 'node' || cmd === 'npm') {
    return { available: true, hint: '内置' }
  }
  const r = await detectBinary(cmd)
  if (r.installed) return { available: true, hint: r.path || '已安装' }
  return { available: false, hint: hints[cmd] || '请确认已安装并加入 PATH' }
}

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { execFile } from 'node:child_process'
import { runQuery } from './database'
import { detectBinary } from './cli-tracker'

export interface McpServerRow {
  id: string
  name: string
  package: string
  command: string
  args: string          // JSON array
  env: string           // JSON object
  status: 'enabled' | 'disabled' | 'error'
  last_error: string | null
  installed_at: string
  updated_at: string
}

interface RunningServer {
  id: string
  client: Client
  transport: StdioClientTransport
  tools: McpToolInfo[]
}

export interface McpToolInfo {
  name: string
  description?: string
  inputSchema: any      // JSON Schema from MCP, 透传给 LLM
}

export class McpManager {
  private servers = new Map<string, RunningServer>()

  async startServer(row: McpServerRow): Promise<{ ok: boolean; tools?: McpToolInfo[]; error?: string }> {
    if (this.servers.has(row.id)) {
      const existing = this.servers.get(row.id)!
      return { ok: true, tools: existing.tools }
    }
    let args: string[] = []
    let env: Record<string, string> = {}
    try { args = JSON.parse(row.args || '[]') } catch { /* 留空 */ }
    try { env = JSON.parse(row.env || '{}') } catch { /* 留空 */ }

    // 前置：探测 command 是否在 PATH 里（这是用户最常踩的坑）
    const cmdCheck = await checkCommandAvailable(row.command)
    if (!cmdCheck.available) {
      const err = `命令 '${row.command}' 不存在：${cmdCheck.hint}`
      await this.recordError(row.id, err)
      return { ok: false, error: err }
    }

    // 临时 spawn 一次采集 stderr（用于诊断"Connection closed"这类无详细错误的场景）
    let stderrPreview = ''
    try {
      const { spawn } = await import('node:child_process')
      const probe = spawn(row.command, args, { env: { ...process.env, ...env }, shell: process.platform === 'win32' })
      let buf = ''
      probe.stderr.on('data', (c: Buffer) => { buf += c.toString(); if (buf.length > 4096) buf = buf.slice(-4096) })
      // 等 1.5 秒看进程是否还活着 / 是否有 stderr
      await new Promise<void>(r => setTimeout(r, 1500))
      if (!probe.killed && probe.exitCode === null) {
        probe.kill()
        stderrPreview = buf.trim().slice(-1000)
      } else {
        stderrPreview = buf.trim().slice(-1000) || `进程退出，code=${probe.exitCode}, signal=${probe.signal}`
      }
    } catch (e: any) {
      stderrPreview = `探测启动失败: ${e.message}`
    }

    let transport: StdioClientTransport
    try {
      transport = new StdioClientTransport({
        command: row.command,
        args,
        env,
        stderr: 'pipe',
      })
    } catch (e: any) {
      await this.recordError(row.id, `启动失败: ${e.message}`)
      return { ok: false, error: e.message }
    }

    const client = new Client({ name: 'ai-workhub', version: '0.1.0' }, { capabilities: {} })
    try {
      await client.connect(transport)
      const { tools } = await client.listTools()
      const info: McpToolInfo[] = (tools as any[]).map(t => ({
        name: String(t.name),
        description: t.description,
        inputSchema: t.inputSchema || { type: 'object', properties: {} },
      }))
      this.servers.set(row.id, { id: row.id, client, transport, tools: info })
      await runQuery(
        "UPDATE mcp_servers SET status = 'enabled', last_error = NULL, updated_at = datetime('now') WHERE id = ?",
        [row.id]
      )
      console.log(`[MCP] 启动成功: ${row.name} (${info.length} 个工具)`)
      return { ok: true, tools: info }
    } catch (e: any) {
      try { await transport.close() } catch {}
      const detail = stderrPreview ? `${e.message} | stderr: ${stderrPreview.slice(0, 500)}` : e.message
      await this.recordError(row.id, `连接失败: ${detail}`)
      return { ok: false, error: detail }
    }
  }

  async stopServer(id: string): Promise<void> {
    const running = this.servers.get(id)
    if (!running) return
    try {
      await running.client.close()
    } catch { /* ignore */ }
    try {
      await running.transport.close()
    } catch { /* ignore */ }
    this.servers.delete(id)
    await runQuery(
      "UPDATE mcp_servers SET status = 'disabled', updated_at = datetime('now') WHERE id = ?",
      [id]
    )
  }

  async stopAll(): Promise<void> {
    for (const id of Array.from(this.servers.keys())) {
      await this.stopServer(id)
    }
  }

  listTools(): McpToolInfo[] {
    const all: McpToolInfo[] = []
    for (const s of this.servers.values()) {
      for (const t of s.tools) {
        // 加 namespace 前缀避免与内置工具冲突
        all.push({ ...t, name: `mcp__${s.id}__${t.name}`, description: `[MCP:${s.id}] ${t.description || t.name}` })
      }
    }
    return all
  }

  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const running = this.servers.get(serverId)
    if (!running) throw new Error(`MCP server ${serverId} 未启动`)
    // 工具名是原始名（不带 namespace 前缀）
    const originalName = toolName.startsWith(`mcp__${serverId}__`)
      ? toolName.slice(`mcp__${serverId}__`.length)
      : toolName
    return await running.client.callTool({ name: originalName, arguments: args })
  }

  private async recordError(id: string, message: string): Promise<void> {
    console.error(`[MCP] ${id}:`, message)
    await runQuery(
      "UPDATE mcp_servers SET status = 'error', last_error = ?, updated_at = datetime('now') WHERE id = ?",
      [message.slice(0, 500), id]
    )
  }
}

// 单例：避免每个 IPC 调用都新建
export const mcpManager = new McpManager()

// Windows 用 where / *nix 用 which 探测 bin 是否存在（工具方法，不属于 Manager 核心）
export function detectBinary(bin: string): Promise<{ installed: boolean; version?: string }> {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    execFile(cmd, [bin], (err, stdout) => {
      if (err) return resolve({ installed: false })
      const installed = !!stdout.toString().trim()
      resolve({ installed })
    })
  })
}