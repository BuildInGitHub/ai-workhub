// 工具基类：把 v1 的 IPC 注入模式带到 v2，约定所有工具都通过 context 拿 IPC 函数
// 与 v1 不同：v2 用 Pi 的 AgentTool 接口（execute 返回 AgentToolResult，错误直接抛）

import { Type, type Static, type TSchema } from '@earendil-works/pi-ai'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import type { ToolContext } from '../types'

// 便捷：用 TypeBox.Object 声明工具参数 schema
export function obj<S extends TSchema>(schema: S) {
  return Type.Object(schema as any) as any
}

// 通用工具工厂：把 name/label/description/parameters 和 execute 包成 AgentTool
export interface BaseToolDef<T extends TSchema> {
  name: string
  label: string
  description: string
  parameters: T
  execute: (ctx: ToolContext, params: Static<T>, signal?: AbortSignal) => Promise<{ content: { type: 'text'; text: string }[]; details?: any }>
}

// 故意把 details 类型放宽为 any：v2 工具的 details 字段 shape 各异，
// 直接传给 AgentTool<any, any> 比强制每个工具精确声明 union 更轻量
export function defineTool<T extends TSchema>(
  ctx: ToolContext,
  def: BaseToolDef<T>
): AgentTool<T, any> {
  return {
    name: def.name,
    label: def.label,
    description: def.description,
    parameters: def.parameters,
    execute: async (_toolCallId, params, signal) => {
      const result = await def.execute(ctx, params as Static<T>, signal)
      return {
        content: result.content,
        details: result.details,
      }
    },
  }
}

// 把任意值安全转成 JSON 文本（避免循环引用）
export function safeJsonText(value: any): string {
  try {
    return JSON.stringify(value, (_k, v) => {
      if (typeof v === 'function') return '[function]'
      return v
    })
  } catch {
    return String(value)
  }
}