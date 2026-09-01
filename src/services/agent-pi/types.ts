// v2 引擎的类型定义（与 Pi SDK 对齐）
// 关键类型说明：
// - Pi 的 Tool<T> 用 TypeBox 定义参数 schema（parameters 是 TSchema 对象）
// - AgentTool.execute 返回 AgentToolResult<TDetails>（不再像 v1 直接返回任意对象）
// - AgentMessage = UserMessage | AssistantMessage | ToolResultMessage

import type { AgentTool, AgentMessage } from '@earendil-works/pi-agent-core'
import type { ToolResultMessage, AssistantMessage, UserMessage } from '@earendil-works/pi-ai'

// 重新导出 Pi 的核心类型，方便上层统一引用
export type { AgentTool, AgentMessage, ToolResultMessage, AssistantMessage, UserMessage }

// IPC 注入：把渲染层需要的 Electron API 收束到一个 context，方便工具内部一致使用
export interface ToolContext {
  dbQuery: (sql: string, params?: any[]) => Promise<{ data: any[]; error?: string }>
  fsReadDir: (path: string) => Promise<{ data: any[]; error?: string }>
  fsReadFile: (path: string) => Promise<{ data: string; error?: string }>
  osHomeDir: () => Promise<{ data: string }>
  shellOpenExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  fsMoveFile?: (src: string, dest: string) => Promise<{ success: boolean; error?: string }>
  // 壁纸直接走 window.electronAPI.wallpaper（保留 v1 的特例）
  getWallpaper: () => Promise<string>
  restoreWallpaper: () => Promise<{ success: boolean; message?: string; error?: string }>
}

// v2 runAgentLoop 返回值与 v1 对齐，让 App.tsx 切换引擎零成本
import type { PlanResult, TaskStep } from '../agent'

export interface V2ExecutionStep {
  tool: string
  input: any
  output?: any
  error?: string
}

export interface V2ExecutionResult {
  success: boolean
  steps: V2ExecutionStep[]
  finalResult?: any
}

export type V2AgentLoopOutcome =
  | { needsExecution: false }
  | {
      needsExecution: true
      plan: PlanResult                    // 兼容 v1：UI 直接读 .thought / .steps
      messages: AgentMessage[]
      steps: V2ExecutionStep[]
      execResult: V2ExecutionResult
      rounds: number
      feedbacks: string[]
    }