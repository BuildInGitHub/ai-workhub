// v2 会话持久化层
// 把 AgentMessage[] 编码为 JSON 写入 chat_history.content（每条一行）
// 加载时按行反序列化为 AgentMessage
// 不改 chat_history 表结构；存储格式与 v1 完全不同（v1 存纯文本，v2 存 JSON 编码的 AgentMessage）

import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { UserMessage, AssistantMessage, ToolResultMessage } from '@earendil-works/pi-ai'

const HISTORY_PREFIX = '__PI_V2__:'

// 一行一个 JSON AgentMessage，方便增量加载
function serializeMessage(msg: AgentMessage): string {
  return HISTORY_PREFIX + JSON.stringify(msg)
}

function deserializeMessage(line: string): AgentMessage | null {
  if (!line.startsWith(HISTORY_PREFIX)) return null
  try {
    return JSON.parse(line.slice(HISTORY_PREFIX.length)) as AgentMessage
  } catch {
    return null
  }
}

// 从 chat_history 加载会话的 AgentMessage 序列
// 过滤掉非 v2 格式的旧消息（v1 写的纯文本）
export async function loadAgentMessages(
  dbQuery: (sql: string, params?: any[]) => Promise<{ data: any[] }>,
  sessionId: string
): Promise<AgentMessage[]> {
  const r = await dbQuery(
    "SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY created_at ASC",
    [sessionId]
  )
  const messages: AgentMessage[] = []
  for (const row of (r.data || [])) {
    const content = String(row.content || '')
    const msg = deserializeMessage(content)
    if (msg) messages.push(msg)
  }
  return messages
}

// 把一段 AgentMessage 写入 chat_history（视为一条新行）
// role 字段按消息类型推导：user→user, assistant→assistant, toolResult→tool
export async function saveAgentMessages(
  dbQuery: (sql: string, params?: any[]) => Promise<any>,
  sessionId: string,
  messages: AgentMessage[]
): Promise<void> {
  if (messages.length === 0) return
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'user'
      : msg.role === 'assistant' ? 'assistant'
      : 'tool' // toolResult
    await dbQuery(
      "INSERT INTO chat_history (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
      [cryptoRandomUUID(), sessionId, role, serializeMessage(msg)]
    )
  }
}

// 简单 UUID（不依赖 crypto 全局，兼容浏览器和 Electron）
function cryptoRandomUUID(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 把 v1 风格的 chatMessages（{role, content}[]）转成 Pi 的 AgentMessage 序列（用于 runAgentLoopV2 入口）
// 关键：保留文本对话，丢掉旧的纯文本"思考"消息
export function chatMessagesToAgentMessages(
  chatMessages: Array<{ role: string; content: string }>,
  currentUserInput: string
): AgentMessage[] {
  const out: AgentMessage[] = []
  for (const m of chatMessages) {
    const ts = Date.now()
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content, timestamp: ts } as UserMessage)
    } else if (m.role === 'assistant') {
      // v1 的助手消息是富文本（含 [Brain]、[CheckCircle] 等图标标记），把它整体作为纯文本回复
      out.push({
        role: 'assistant',
        content: [{ type: 'text', text: m.content }],
        api: 'openai-completions',
        provider: 'deepseek',
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        stopReason: 'stop',
        timestamp: ts,
      } as unknown as AssistantMessage)
    }
    // 忽略其他 role（v1 没有 tool role）
  }
  // 末尾追加当前用户消息（如果 chatMessages 末尾不是它）
  const last = out[out.length - 1] as UserMessage | undefined
  if (!last || last.role !== 'user' || last.content !== currentUserInput) {
    out.push({ role: 'user', content: currentUserInput, timestamp: Date.now() } as UserMessage)
  }
  return out
}