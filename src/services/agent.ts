import { v4 as uuidv4 } from 'uuid'

// 工具定义
interface Tool {
  name: string
  description: string
  parameters: any[]
  execute: (params: Record<string, any>) => Promise<any>
}

// 内置工具 - 使用全局变量确保跨模块可用
const tools: Map<string, Tool> = new Map()
let toolsInitialized = false

// 导出工具列表供外部使用
let toolsListCache: Array<{name: string, description: string, parameters: any[]}> = []

// 注册工具
export function registerTool(tool: Tool) {
  console.log('[Agent] 注册工具:', tool.name)
  tools.set(tool.name, tool)
  // 更新缓存
  toolsListCache = Array.from(tools.values()).map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }))
}

// 获取工具初始化状态
export function isToolsInitialized() {
  return toolsInitialized
}

// 设置工具初始化状态
export function setToolsInitialized() {
  toolsInitialized = true
  toolsListCache = Array.from(tools.values()).map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }))
  console.log('[Agent] 工具初始化完成:', toolsListCache.map(t => t.name))
}

// 获取所有工具
export function getTools() {
  if (toolsListCache.length > 0) {
    return toolsListCache
  }
  // 如果缓存为空，尝试从map获取
  const list = Array.from(tools.values()).map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }))
  if (list.length > 0) {
    toolsListCache = list
  }
  return list
}

// 工具执行器 - 使用导出的toolsListCache确保访问正确的工具列表
export async function executeTool(toolName: string, params: Record<string, any>): Promise<any> {
  console.log('[Agent] executeTool 调用:', toolName, '参数:', params)
  console.log('[Agent] toolsListCache:', toolsListCache.map(t => t.name))
  
  // 使用toolsListCache而不是直接访问tools Map
  if (toolsListCache.length === 0) {
    console.error('[Agent] 工具列表为空')
    return { success: false, error: '工具系统未初始化，工具列表为空' }
  }
  
  // 尝试精确匹配
  let matchedTool = toolsListCache.find(t => t.name === toolName)
  
  // 如果没找到，尝试模糊匹配
  if (!matchedTool) {
    const toolNames = toolsListCache.map(t => t.name)
    // 尝试包含匹配
    const similar = toolNames.find(name => 
      name.toLowerCase().includes(toolName.toLowerCase()) || 
      toolName.toLowerCase().includes(name.toLowerCase())
    )
    if (similar) {
      console.log('[Agent] 模糊匹配到工具:', toolName, '->', similar)
      matchedTool = toolsListCache.find(t => t.name === similar)
    }
  }
  
  if (!matchedTool) {
    console.error('[Agent] 工具不存在:', toolName, '已注册工具:', toolsListCache.map(t => t.name))
    return { success: false, error: `工具 ${toolName} 不存在。已注册: ${toolsListCache.map(t => t.name).join(', ')}` }
  }
  
  // 从tools Map获取实际执行函数
  const tool = tools.get(matchedTool.name)
  
  if (!tool) {
    return { success: false, error: `Tool ${matchedTool.name} not found` }
  }
  
  try {
    const result = await tool.execute(params)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 初始化内置工具
export function initBuiltinTools(
  dbQuery: (sql: string, params?: any[]) => Promise<any>,
  shellOpenExternal: (url: string) => Promise<void>,
  fsReadDir: (path: string) => Promise<any>,
  fsReadFile: (path: string) => Promise<any>,
  osHomeDir: () => Promise<string>,
  fsMoveFile?: (srcPath: string, destPath: string) => Promise<any>
) {
  // 搜索任务
  registerTool({
    name: 'search_tasks',
    description: '搜索任务列表',
    parameters: [
      { name: 'keyword', type: 'string', description: '搜索关键词', required: false },
      { name: 'status', type: 'string', description: '任务状态: active/completed', required: false }
    ],
    execute: async (params) => {
      let sql = "SELECT * FROM tasks WHERE 1=1"
      const queryParams: any[] = []
      
      if (params.keyword) {
        sql += " AND (title LIKE ? OR description LIKE ?)"
        queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`)
      }
      
      if (params.status === 'active') {
        sql += " AND completed = 0"
      } else if (params.status === 'completed') {
        sql += " AND completed = 1"
      }
      
      sql += " ORDER BY created_at DESC LIMIT 10"
      
      const result = await dbQuery(sql, queryParams)
      return result.data || []
    }
  })

  // 创建任务
  registerTool({
    name: 'create_task',
    description: '创建新任务',
    parameters: [
      { name: 'title', type: 'string', description: '任务标题', required: true },
      { name: 'description', type: 'string', description: '任务描述', required: false },
      { name: 'priority', type: 'string', description: '优先级: low/medium/high', required: false },
      { name: 'due_date', type: 'string', description: '截止日期 YYYY-MM-DD', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      await dbQuery(
        "INSERT INTO tasks (id, title, description, priority, due_date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))",
        [id, params.title, params.description || '', params.priority || 'medium', params.due_date || null]
      )
      return { id, title: params.title }
    }
  })

  // 完成/取消任务
  registerTool({
    name: 'complete_task',
    description: '完成任务或取消完成状态',
    parameters: [
      { name: 'task_id', type: 'string', description: '任务ID', required: true },
      { name: 'completed', type: 'boolean', description: '是否完成', required: false }
    ],
    execute: async (params) => {
      await dbQuery(
        "UPDATE tasks SET completed = ?, updated_at = datetime('now') WHERE id = ?",
        [params.completed !== false ? 1 : 0, params.task_id]
      )
      return { success: true }
    }
  })

  // 搜索链接
  registerTool({
    name: 'search_links',
    description: '搜索收藏的链接',
    parameters: [
      { name: 'keyword', type: 'string', description: '搜索关键词', required: false },
      { name: 'limit', type: 'number', description: '返回数量限制', required: false }
    ],
    execute: async (params) => {
      const limit = params.limit || 10
      let sql = "SELECT * FROM links"
      const queryParams: any[] = []
      
      if (params.keyword) {
        sql += " WHERE title LIKE ? OR url LIKE ? OR description LIKE ?"
        queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`, `%${params.keyword}%`)
      }
      
      sql += ` ORDER BY created_at DESC LIMIT ${limit}`
      
      const result = await dbQuery(sql, queryParams)
      return result.data || []
    }
  })

  // 添加链接
  registerTool({
    name: 'add_link',
    description: '添加新的链接收藏',
    parameters: [
      { name: 'title', type: 'string', description: '链接标题', required: true },
      { name: 'url', type: 'string', description: '链接地址', required: true },
      { name: 'description', type: 'string', description: '链接描述', required: false },
      { name: 'tags', type: 'string', description: '标签，逗号分隔', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      await dbQuery(
        "INSERT INTO links (id, title, url, description, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [id, params.title, params.url, params.description || '', params.tags || '']
      )
      return { id, title: params.title, url: params.url }
    }
  })

  // 打开链接
  registerTool({
    name: 'open_url',
    description: '在浏览器中打开URL',
    parameters: [
      { name: 'url', type: 'string', description: '要打开的URL', required: true }
    ],
    execute: async (params) => {
      await shellOpenExternal(params.url)
      return { success: true, url: params.url }
    }
  })

  // 浏览目录
  registerTool({
    name: 'browse_directory',
    description: '浏览目录内容',
    parameters: [
      { name: 'path', type: 'string', description: '目录路径', required: true }
    ],
    execute: async (params) => {
      const result = await fsReadDir(params.path)
      return result
    }
  })

  // 读取文件内容
  registerTool({
    name: 'read_file',
    description: '读取文本文件内容',
    parameters: [
      { name: 'path', type: 'string', description: '文件路径', required: true },
      { name: 'lines', type: 'number', description: '读取行数，默认100', required: false }
    ],
    execute: async (params) => {
      const result = await fsReadFile(params.path)
      if (result.content) {
        const lines = result.content.split('\n').slice(0, params.lines || 100)
        return { content: lines.join('\n'), totalLines: result.content.split('\n').length }
      }
      return { error: result.error || '无法读取文件' }
    }
  })

  // 获取用户主目录
  registerTool({
    name: 'get_home_directory',
    description: '获取用户主目录路径',
    parameters: [],
    execute: async () => {
      const home = await osHomeDir()
      return { path: home }
    }
  })

  // 整理桌面文件
  registerTool({
    name: 'organize_desktop',
    description: '整理桌面文件，按文件类型分类并返回整理建议',
    parameters: [
      { name: 'path', type: 'string', description: '桌面路径（可选，默认桌面）', required: false }
    ],
    execute: async (params) => {
      const desktopPath = params.path || (await osHomeDir()) + '\\Desktop'
      
      try {
        const result = await fsReadDir(desktopPath)
        
        if (!result || result.length === 0) {
          return { message: '桌面是空的，无需整理', suggestions: [] }
        }
        
        // 按类型分类
        const categories: Record<string, { name: string, files: string[], count: number }> = {
          '图片': { name: '图片', files: [], count: 0 },
          '文档': { name: '文档', files: [], count: 0 },
          '视频': { name: '视频', files: [], count: 0 },
          '音频': { name: '音频', files: [], count: 0 },
          '压缩包': { name: '压缩包', files: [], count: 0 },
          '安装包': { name: '安装包', files: [], count: 0 },
          '其他': { name: '其他', files: [], count: 0 }
        }
        
        const extensions: Record<string, string> = {
          // 图片
          '.jpg': '图片', '.jpeg': '图片', '.png': '图片', '.gif': '图片', 
          '.bmp': '图片', '.svg': '图片', '.webp': '图片', '.ico': '图片',
          // 文档
          '.doc': '文档', '.docx': '文档', '.pdf': '文档', '.txt': '文档',
          '.xls': '文档', '.xlsx': '文档', '.ppt': '文档', '.pptx': '文档',
          '.md': '文档', '.csv': '文档',
          // 视频
          '.mp4': '视频', '.avi': '视频', '.mkv': '视频', '.mov': '视频',
          '.wmv': '视频', '.flv': '视频', '.webm': '视频',
          // 音频
          '.mp3': '音频', '.wav': '音频', '.flac': '音频', '.aac': '音频',
          '.ogg': '音频', '.wma': '音频',
          // 压缩包
          '.zip': '压缩包', '.rar': '压缩包', '.7z': '压缩包', '.tar': '压缩包', '.gz': '压缩包',
          // 安装包
          '.exe': '安装包', '.msi': '安装包', '.dmg': '安装包', '.pkg': '安装包', '.deb': '安装包'
        }
        
        const files = result.filter((f: any) => f.isFile)
        const folders = result.filter((f: any) => f.isDirectory)
        
        for (const file of files) {
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
          const category = extensions[ext] || '其他'
          categories[category].files.push(file.name)
          categories[category].count++
        }
        
        // 统计信息
        const stats = {
          totalFiles: files.length,
          totalFolders: folders.length,
          categories: Object.values(categories).filter(c => c.count > 0)
        }
        
        // 建议
        const suggestions: string[] = []
        if (files.length > 20) {
          suggestions.push(`桌面有 ${files.length} 个文件，建议整理`)
        }
        for (const cat of stats.categories) {
          if (cat.count > 3) {
            suggestions.push(`建议创建"${cat.name}"文件夹，将 ${cat.count} 个文件移动进去`)
          }
        }
        
        return {
          desktopPath,
          stats,
          suggestions,
          message: suggestions.length > 0 ? '整理建议已生成' : '桌面很整洁'
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  })

  // 执行桌面整理（移动文件）
  registerTool({
    name: 'execute_organize_desktop',
    description: '执行桌面整理，将文件按类型移动到分类文件夹',
    parameters: [
      { name: 'path', type: 'string', description: '桌面路径', required: false }
    ],
    execute: async (params) => {
      if (!fsMoveFile) {
        return { error: '文件系统移动功能不可用' }
      }
      
      const desktopPath = params.path || (await osHomeDir()) + '\\Desktop'
      
      try {
        const result = await fsReadDir(desktopPath)
        
        if (!result || result.length === 0) {
          return { message: '桌面是空的，无需整理', moved: [] }
        }
        
        // 分类映射
        const categoryMap: Record<string, string> = {
          '.jpg': '图片', '.jpeg': '图片', '.png': '图片', '.gif': '图片',
          '.bmp': '图片', '.svg': '图片', '.webp': '图片', '.ico': '图片',
          '.doc': '文档', '.docx': '文档', '.pdf': '文档', '.txt': '文档',
          '.xls': '文档', '.xlsx': '文档', '.ppt': '文档', '.pptx': '文档',
          '.md': '文档', '.csv': '文档',
          '.mp4': '视频', '.avi': '视频', '.mkv': '视频', '.mov': '视频',
          '.wmv': '视频', '.flv': '视频', '.webm': '视频',
          '.mp3': '音频', '.wav': '音频', '.flac': '音频', '.aac': '音频',
          '.ogg': '音频', '.wma': '音频',
          '.zip': '压缩包', '.rar': '压缩包', '.7z': '压缩包',
          '.tar': '压缩包', '.gz': '压缩包',
          '.exe': '安装包', '.msi': '安装包', '.dmg': '安装包'
        }
        
        const moved: string[] = []
        const errors: string[] = []
        
        const files = result.filter((f: any) => f.isFile)
        
        for (const file of files) {
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
          const category = categoryMap[ext] || '其他'
          const destFolder = desktopPath + '\\' + category
          const destPath = destFolder + '\\' + file.name
          
          // 跳过已经在正确分类文件夹中的文件
          if (file.path && file.path.includes('\\' + category + '\\')) {
            continue
          }
          
          try {
            const moveResult = await fsMoveFile(file.path, destPath)
            if (moveResult.success) {
              moved.push(`${file.name} -> ${category}`)
            }
          } catch (e: any) {
            errors.push(`${file.name}: ${e.message}`)
          }
        }
        
        return {
          message: `已移动 ${moved.length} 个文件`,
          moved,
          errors: errors.length > 0 ? errors : undefined
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  })

  // 列出收藏的文件
  registerTool({
    name: 'list_favorite_files',
    description: '列出所有收藏的文件',
    parameters: [],
    execute: async () => {
      const result = await dbQuery("SELECT * FROM favorite_files ORDER BY created_at DESC")
      return result.data || []
    }
  })

  // 搜索日历事件
  registerTool({
    name: 'search_calendar',
    description: '搜索日历事件',
    parameters: [
      { name: 'keyword', type: 'string', description: '搜索关键词', required: false },
      { name: 'date', type: 'string', description: '日期 YYYY-MM-DD', required: false }
    ],
    execute: async (params) => {
      let sql = "SELECT * FROM calendar_events WHERE 1=1"
      const queryParams: any[] = []
      
      if (params.keyword) {
        sql += " AND (title LIKE ? OR description LIKE ?)"
        queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`)
      }
      
      if (params.date) {
        sql += " AND date( date ) = date( ? )"
        queryParams.push(params.date)
      }
      
      sql += " ORDER BY date ASC, time ASC LIMIT 20"
      
      const result = await dbQuery(sql, queryParams)
      return result.data || []
    }
  })

  // 创建日历事件
  registerTool({
    name: 'create_calendar_event',
    description: '创建日历事件',
    parameters: [
      { name: 'title', type: 'string', description: '事件标题', required: true },
      { name: 'date', type: 'string', description: '日期 YYYY-MM-DD', required: true },
      { name: 'time', type: 'string', description: '时间 HH:MM', required: false },
      { name: 'description', type: 'string', description: '事件描述', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      await dbQuery(
        "INSERT INTO calendar_events (id, title, date, time, description, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        [id, params.title, params.date, params.time || null, params.description || '']
      )
      return { id, title: params.title, date: params.date }
    }
  })

  // 搜索项目
  registerTool({
    name: 'search_projects',
    description: '搜索项目',
    parameters: [
      { name: 'keyword', type: 'string', description: '搜索关键词', required: false }
    ],
    execute: async (params) => {
      let sql = "SELECT * FROM projects"
      const queryParams: any[] = []
      
      if (params.keyword) {
        sql += " WHERE name LIKE ? OR description LIKE ?"
        queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`)
      }
      
      sql += " ORDER BY updated_at DESC LIMIT 20"
      
      const result = await dbQuery(sql, queryParams)
      return result.data || []
    }
  })

  // 创建项目
  registerTool({
    name: 'create_project',
    description: '创建新项目',
    parameters: [
      { name: 'name', type: 'string', description: '项目名称', required: true },
      { name: 'description', type: 'string', description: '项目描述', required: false },
      { name: 'color', type: 'string', description: '项目颜色', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      const color = params.color || '#737373'
      await dbQuery(
        "INSERT INTO projects (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
        [id, params.name, params.description || '', color]
      )
      return { id, name: params.name }
    }
  })

  // 快速笔记
  registerTool({
    name: 'quick_note',
    description: '创建快速笔记',
    parameters: [
      { name: 'content', type: 'string', description: '笔记内容', required: true },
      { name: 'title', type: 'string', description: '笔记标题', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      const title = params.title || params.content.slice(0, 30) + '...'
      await dbQuery(
        "INSERT INTO quick_notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
        [id, title, params.content]
      )
      return { id, title }
    }
  })

  // 搜索笔记
  registerTool({
    name: 'search_notes',
    description: '搜索笔记',
    parameters: [
      { name: 'keyword', type: 'string', description: '搜索关键词', required: false }
    ],
    execute: async (params) => {
      let sql = "SELECT * FROM quick_notes"
      const queryParams: any[] = []
      
      if (params.keyword) {
        sql += " WHERE title LIKE ? OR content LIKE ?"
        queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`)
      }
      
      sql += " ORDER BY updated_at DESC LIMIT 20"
      
      const result = await dbQuery(sql, queryParams)
      return result.data || []
    }
  })

  // 计算器
  registerTool({
    name: 'calculate',
    description: '简单数学计算',
    parameters: [
      { name: 'expression', type: 'string', description: '数学表达式', required: true }
    ],
    execute: async (params) => {
      try {
        // 安全计算：只允许数字和基本运算符
        const expr = params.expression.replace(/[^0-9+\-*/().%]/g, '')
        const result = Function(`"use strict"; return (${expr})`)()
        return { expression: params.expression, result }
      } catch (e) {
        return { error: '无效的表达式' }
      }
    }
  })

  console.log('[Agent] 内置工具已注册:', Array.from(tools.keys()))
  setToolsInitialized()
}

// 任务解析器 - 将自然语言解析为可执行步骤
export interface ParsedTask {
  intent: string
  entities: Record<string, any>
  suggestedTool?: string
  confidence: number
}

export async function parseTask(userInput: string, apiKey: string): Promise<ParsedTask> {
  // 使用LLM解析用户意图
  const toolsList = getTools()
  
  const prompt = `
你是一个任务解析器。用户输入: "${userInput}"

可用的工具:
${toolsList.map(t => `- ${t.name}: ${t.description}`).join('\n')}

请分析用户意图，返回JSON格式:
{
  "intent": "用户意图摘要",
  "entities": { extracted entities },
  "suggestedTool": "最合适的工具名，如果没有则null",
  "confidence": 0.0-1.0
}

只返回JSON，不要其他内容。
`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个任务解析助手，擅长分析用户意图并选择合适的工具。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    return result
  } catch (error) {
    console.error('任务解析失败:', error)
    return {
      intent: userInput,
      entities: {},
      suggestedTool: undefined,
      confidence: 0
    }
  }
}

// 执行任务
export interface ExecutionResult {
  success: boolean
  steps: Array<{
    tool: string
    input: any
    output?: any
    error?: string
  }>
  finalResult?: any
}

// ============ 增强任务规划 - Pi Agent 核心能力 ============

// 任务步骤
export interface TaskStep {
  id: number
  description: string
  tool?: string
  params?: Record<string, any>
  status: 'pending' | 'thinking' | 'executing' | 'completed' | 'failed'
  result?: any
  error?: string
}

// 规划结果
export interface PlanResult {
  task: string
  thought: string        // 思考过程
  steps: TaskStep[]       // 任务步骤
  needsExecution: boolean
}

// 复杂任务规划器 - 拆解任务为步骤
export async function planTask(userInput: string, apiKey: string): Promise<PlanResult> {
  const toolsList = getTools()
  console.log('[Agent] planTask 获取工具列表:', toolsList.map(t => t.name))
  
  const prompt = `
你是一个AI任务规划助手(Pi Agent)。用户请求: "${userInput}"

可用工具(必须使用以下精确的工具名):
${toolsList.map(t => `- ${t.name}: ${t.description}`).join('\n')}

请按以下JSON格式分析并规划任务:
{
  "thought": "你的思考过程",
  "steps": [
    {
      "id": 1,
      "description": "步骤描述",
      "tool": "工具名",
      "params": {参数}
    }
  ],
  "needsExecution": true
}

强制规则:
1. 大部分任务都可以用工具完成，needsExecution始终为true
2. 如果不知道具体参数，至少选择一个相关工具
3. 不要返回needsExecution: false
4. 如果需要搜索文件，用browse_directory或read_file
5. 如果需要搜索任务，用search_tasks
6. 如果需要搜索日历，用search_calendar
7. 如果需要创建任务，用create_task
8. 如果需要创建日历事件，用create_calendar_event
9. 如果需要搜索项目，用search_projects
10. 桌面路径直接使用: "C:\\\\Users\\\\dot backup\\\\Desktop" (Windows默认桌面)
11. 用户主目录是: "C:\\\\Users\\\\dot backup"
12. 整理桌面文件用 organize_desktop 工具，它会自动获取桌面路径
13. 如果需要分析桌面文件并整理，直接调用 organize_desktop 或 execute_organize_desktop 工具

只返回JSON，不要其他内容。
`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个专业的任务规划助手，擅长将复杂任务拆解为可执行的步骤。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    return {
      task: userInput,
      thought: result.thought || '分析任务中...',
      steps: (result.steps || []).map((s: any, i: number) => ({
        id: s.id || i + 1,
        description: s.description,
        tool: s.tool,
        params: s.params || {},
        status: 'pending' as const
      })),
      needsExecution: result.needsExecution !== false
    }
  } catch (error) {
    console.error('任务规划失败:', error)
    return {
      task: userInput,
      thought: '任务规划遇到错误',
      steps: [],
      needsExecution: false
    }
  }
}

// 执行规划好的任务步骤
export async function executePlan(plan: PlanResult): Promise<ExecutionResult> {
  const steps: ExecutionResult['steps'] = []
  
  for (const step of plan.steps) {
    if (!step.tool) continue
    
    step.status = 'executing'
    
    try {
      const result = await executeTool(step.tool, step.params || {})
      step.status = result.success ? 'completed' : 'failed'
      step.result = result.success ? result.data : undefined
      step.error = result.error
      
      steps.push({
        tool: step.tool,
        input: step.params,
        output: result.success ? result.data : undefined,
        error: result.error
      })
      
      // 如果步骤失败，停止执行
      if (!result.success) {
        break
      }
    } catch (error: any) {
      step.status = 'failed'
      step.error = error.message
      
      steps.push({
        tool: step.tool,
        input: step.params,
        error: error.message
      })
      break
    }
  }

  const allSuccess = plan.steps.every(s => s.status === 'completed')
  
  return {
    success: allSuccess,
    steps,
    finalResult: allSuccess 
      ? `已完成${plan.steps.length}个步骤`
      : `执行中断，共完成${steps.length}个步骤`
  }
}

// 完整的任务执行（规划+执行）
export async function executeComplexTask(userInput: string, apiKey: string): Promise<{
  plan: PlanResult
  execution: ExecutionResult
}> {
  // 1. 规划任务
  const plan = await planTask(userInput, apiKey)
  
  // 2. 执行任务
  const execution = await executePlan(plan)
  
  return { plan, execution }
}

// 原有函数保持兼容
export async function executeTask(parsed: ParsedTask, apiKey: string): Promise<ExecutionResult> {
  const steps: ExecutionResult['steps'] = []
  
  if (!parsed.suggestedTool) {
    return {
      success: false,
      steps,
      finalResult: '无法理解任务，请尝试更明确的表达'
    }
  }

  // 执行工具
  try {
    const result = await executeTool(parsed.suggestedTool, parsed.entities)
    steps.push({
      tool: parsed.suggestedTool,
      input: parsed.entities,
      output: result.success ? result.data : undefined,
      error: result.error
    })

    return {
      success: result.success,
      steps,
      finalResult: result.success ? result.data : result.error
    }
  } catch (error: any) {
    steps.push({
      tool: parsed.suggestedTool,
      input: parsed.entities,
      error: error.message
    })
    
    return {
      success: false,
      steps,
      finalResult: error.message
    }
  }
}
