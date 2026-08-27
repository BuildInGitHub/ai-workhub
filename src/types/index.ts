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
  due_date?: string
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
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
