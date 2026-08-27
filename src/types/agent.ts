// Agent 类型定义

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'completed' | 'error'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: string
}

export interface AgentTask {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  description: string
  steps: AgentStep[]
  result?: string
  error?: string
}

export interface AgentStep {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  tool?: string
  input?: any
  output?: any
  error?: string
}

// 工具定义
export interface Tool {
  name: string
  description: string
  parameters: ToolParameter[]
  execute: (params: Record<string, any>) => Promise<ToolResult>
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  description: string
  required: boolean
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

// MCP 协议类型
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: Record<string, any>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

// RAG 类型
export interface KnowledgeItem {
  id: string
  content: string
  source: string
  embedding?: number[]
  metadata: Record<string, any>
  createdAt: string
}

export interface SearchResult {
  item: KnowledgeItem
  score: number
}
