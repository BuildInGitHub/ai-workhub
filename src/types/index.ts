// 文件系统类型
export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size?: number
  modified?: string
  created?: string
}

export interface FileStats {
  name: string
  path: string
  size: number
  isDirectory: boolean
  isFile: boolean
  modified: string
  created: string
}

// 链接类型
export interface Link {
  id: string
  title: string
  url: string
  description?: string
  favicon?: string
  tags?: string
  category?: string        // 分类：工作/学习/生活/购物/娱乐/工具/其他
  account?: string         // 关联账号
  password_hint?: string   // 密码提示（不存明文密码）
  created_at: string
  updated_at: string
}

// 收藏文件类型
export interface FavoriteFile {
  id: string
  name: string
  path: string
  type?: string
  size?: number
  created_at: string
}

// 任务类型
export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  due_date?: string | null
  start_date?: string | null        // 开始时间 YYYY-MM-DD
  parent_id?: string | null        // 父任务ID（两级结构）
  status?: 'todo' | 'doing' | 'done' // 看板状态
  created_at: string
  updated_at: string
}

// 项目类型
export interface Project {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

// AI消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  /** v2 引擎执行工具的细节（arguments / stdout 等），用于 UI 展开调试 */
  tool_calls?: Array<{ tool: string; args?: any; stdout?: string; stderr?: string; ok?: boolean }>
}

// 快速启动项
export interface QuickLaunchItem {
  id: string
  name: string
  type: 'file' | 'folder' | 'link' | 'app'
  path: string
  icon?: string
  position: number
}

// 标签页类型
export interface Tab {
  id: string
  title: string
  type: 'files' | 'links' | 'tasks' | 'projects' | 'quick-launch' | 'home' | 'calendar' | 'search'
  icon?: string
  closable: boolean
}

// DeepSeek API 类型
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekRequest {
  model: string
  messages: DeepSeekMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface DeepSeekResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Electron API 类型
export interface ElectronAPI {
  fs: {
    readDir: (dirPath: string) => Promise<FileEntry[]>
    getStats: (filePath: string) => Promise<FileStats>
    readFile: (filePath: string) => Promise<{ content?: string; error?: string }>
    getDrives: () => Promise<string[]>
    moveFile?: (srcPath: string, destPath: string) => Promise<{ success?: boolean; error?: string }>
  }
  dialog: {
    selectDirectory: () => Promise<string | null>
    selectFile?: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
    selectApp?: () => Promise<string | null>
  }
  os: {
    homeDir: () => Promise<string>
    desktopDir: () => Promise<string>
    documentsDir: () => Promise<string>
  }
  wallpaper?: {
    get: () => Promise<string | null>
    restore: () => Promise<{ success: boolean; message: string; path?: string }>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
    openPath?: (path: string) => Promise<void>
  }
  db: {
    query: (sql: string, params?: any[]) => Promise<{ data?: any; error?: string }>
    backupNow?: () => Promise<{ success: boolean; message: string; path?: string }>
    exportData?: () => Promise<{ success: boolean; message: string }>
    importData?: () => Promise<{ success: boolean; message: string }>
    getBackupInfo?: () => Promise<{
      dbPath: string
      backupDir: string
      dbSize: number
      backups: Array<{ name: string; size: number; time: string }>
    }>
  }
  // v2 引擎扩展：MCP / Skills / CLI / Marketplace
  market?: {
    fetch: () => Promise<{ items: any[]; source: 'remote' | 'local'; error?: string }>
  }
  mcp?: {
    listServers: () => Promise<{ data?: any[]; error?: string }>
    start: (id: string) => Promise<{ ok: boolean; tools?: any[]; error?: string }>
    stop: (id: string) => Promise<{ ok: boolean }>
    install: (item: any) => Promise<{ ok: boolean; id?: string; error?: string }>
    uninstall: (id: string) => Promise<{ ok: boolean }>
    listTools: () => Promise<Array<{ name: string; description?: string; inputSchema: any }>>
    callTool: (serverId: string, toolName: string, args: any) => Promise<any>
    /** 把所有 error 状态的 MCP server 重置为 disabled，让"启动"按钮重新可点 */
    resetErrors: () => Promise<{ ok: boolean; count: number }>
    /** 重新尝试启动所有 enabled / disabled / error 状态的 server（用于"重试所有"按钮） */
    reconnectAll: () => Promise<{ ok: number; fail: number; total: number }>
  }
  skill?: {
    list: () => Promise<Array<{ name: string; description: string; content: string; filePath: string }>>
    skillsRoot: () => Promise<string>
    installFromMarket: (item: any) => Promise<{ ok: boolean; error?: string }>
    remove: (name: string) => Promise<{ ok: boolean }>
    readContent: (name: string) => Promise<{ content?: string; error?: string }>
  }
  cli?: {
    list: () => Promise<{ data?: any[]; error?: string }>
    detect: (bin: string) => Promise<{ installed: boolean; version?: string; path?: string }>
    install: (item: any) => Promise<{ ok: boolean; output: string; error?: string }>
    uninstall: (row: any) => Promise<{ ok: boolean; output: string; error?: string }>
    remove: (id: string) => Promise<{ ok: boolean }>
    exec: (bin: string, args: string[]) => Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number | null; error?: string }>
  }
  /** 强制中止 AI 执行：杀掉所有正在跑的 CLI/MCP 子进程 */
  ai?: {
    abort: () => Promise<{ ok: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
