// CLI Tracker：检测 PATH 中的可执行文件（which/where），执行安装/卸载命令
// 不持久化扫描结果到 cli_commands 表的"installed"字段，只在用户主动"刷新"时实时探测

import { execFile } from 'node:child_process'

const TIMEOUT_MS = 5 * 60 * 1000 // 5 分钟硬超时
const VERSION_FLAGS = ['--version', '-v', 'version']

export function detectBinary(bin: string): Promise<{ installed: boolean; version?: string; path?: string }> {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    execFile(cmd, [bin], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ installed: false })
      const out = stdout.toString().trim()
      if (!out) return resolve({ installed: false })
      // 探测版本：依次试 --version/-v/version
      const tryVersion = (flags: string[], i: number) => {
        if (i >= flags.length) return resolve({ installed: true, path: out.split('\n')[0] })
        execFile(bin, [flags[i]], { timeout: 5000 }, (e, so) => {
          if (!e && so.toString().trim()) {
            resolve({ installed: true, version: so.toString().trim().split('\n')[0], path: out.split('\n')[0] })
          } else {
            tryVersion(flags, i + 1)
          }
        })
      }
      tryVersion(VERSION_FLAGS, 0)
    })
  })
}

export function runInstall(cmd: string, onProgress?: (chunk: string) => void): Promise<{ ok: boolean; output: string; error?: string }> {
  return new Promise(resolve => {
    const child = execFile(cmd, { shell: true, timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr || '')
      if (err) resolve({ ok: false, output: out, error: err.message })
      else resolve({ ok: true, output: out })
    })
    if (onProgress && child.stdout) {
      child.stdout.on('data', (chunk) => onProgress(chunk.toString()))
    }
    if (onProgress && child.stderr) {
      child.stderr.on('data', (chunk) => onProgress(chunk.toString()))
    }
  })
}
// 让 v2 引擎真正"调用"用户安装的 CLI 工具（spawnSync 同步返回 stdout/stderr）
export function execCli(bin: string, args: string[], timeoutMs: number = 15000): { ok: boolean; stdout: string; stderr: string; exitCode: number | null; error?: string } {
  return (() => {
    try {
      const { spawnSync } = require('node:child_process')
      const proc = spawnSync(bin, args, { encoding: 'utf-8', timeout: timeoutMs, maxBuffer: 1024 * 1024, shell: process.platform === 'win32' })
      if (proc.error) return { ok: false, stdout: '', stderr: '', exitCode: null, error: proc.error.message }
      return {
        ok: proc.status === 0,
        stdout: (proc.stdout || '').toString().slice(0, 20000),
        stderr: (proc.stderr || '').toString().slice(0, 5000),
        exitCode: proc.status,
      }
    } catch (e: any) {
      return { ok: false, stdout: '', stderr: '', exitCode: null, error: e.message }
    }
  })()
}
