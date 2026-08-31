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
  fsMoveFile?: (srcPath: string, destPath: string) => Promise<any>,
  getWallpaper?: () => Promise<string | null>
) {
  // 受保护文件判定：壁纸、系统文件、快捷方式、隐藏文件一律不动
  const getProtectedPaths = async (): Promise<Set<string>> => {
    const protectedSet = new Set<string>()
    try {
      const wallpaper = await getWallpaper?.()
      if (wallpaper) {
        protectedSet.add(wallpaper.toLowerCase())
      }
    } catch {
      // 读取失败不影响整理，只是少了壁纸保护
    }
    return protectedSet
  }

  const isProtectedFile = (file: any, wallpaperPaths: Set<string>): boolean => {
    const name = (file.name || '').toLowerCase()
    const filePath = (file.path || '').toLowerCase()
    // 系统文件与配置
    if (name === 'desktop.ini' || name === 'thumbs.db') return true
    // 隐藏文件
    if (name.startsWith('.')) return true
    // 快捷方式（移动会破坏桌面应用入口）
    if (name.endsWith('.lnk') || name.endsWith('.url')) return true
    // 主题/壁纸相关文件（移动会导致主题丢失、壁纸变黑）
    if (name.endsWith('.theme') || name.endsWith('.themepack') || name.endsWith('.deskthemepack')) return true
    // 当前壁纸文件
    if (wallpaperPaths.has(filePath)) return true
    return false
  }

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
    description: '创建新任务（支持作为子任务创建，status: todo/doing/done）',
    parameters: [
      { name: 'title', type: 'string', description: '任务标题', required: true },
      { name: 'description', type: 'string', description: '任务描述', required: false },
      { name: 'priority', type: 'string', description: '优先级: low/medium/high', required: false },
      { name: 'due_date', type: 'string', description: '截止日期 YYYY-MM-DD', required: false },
      { name: 'status', type: 'string', description: '状态: todo/doing/done，默认todo', required: false },
      { name: 'parent_task_id', type: 'string', description: '父任务ID（创建子任务时使用，先用search_tasks查询父任务）', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      const status = ['todo', 'doing', 'done'].includes(params.status) ? params.status : 'todo'
      const completed = status === 'done' ? 1 : 0
      await dbQuery(
        "INSERT INTO tasks (id, title, description, priority, due_date, completed, status, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [id, params.title, params.description || '', params.priority || 'medium', params.due_date || null, completed, status, params.parent_task_id || null]
      )
      return { id, title: params.title, status }
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
      { name: 'tags', type: 'string', description: '标签，逗号分隔', required: false },
      { name: 'category', type: 'string', description: '分类: 工作/学习/生活/购物/娱乐/工具/其他', required: false },
      { name: 'account', type: 'string', description: '关联账号', required: false },
      { name: 'password_hint', type: 'string', description: '密码提示（只存提示，不存明文密码）', required: false }
    ],
    execute: async (params) => {
      const id = uuidv4()
      await dbQuery(
        "INSERT INTO links (id, title, url, description, tags, category, account, password_hint, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [id, params.title, params.url, params.description || '', params.tags || '', params.category || '', params.account || '', params.password_hint || '']
      )
      return { id, title: params.title, url: params.url, category: params.category || '' }
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

  // 搜索已安装应用（扫描开始菜单/桌面/常见安装目录）
  registerTool({
    name: 'search_apps',
    description: '按名称搜索本机已安装的应用程序，返回应用名称和快捷方式路径（.lnk 或 .exe）',
    parameters: [
      { name: 'keyword', type: 'string', description: '应用名称关键词，如 "网易云音乐"、"微信"、"cloudmusic"', required: true }
    ],
    execute: async (params) => {
      const keyword = String(params.keyword || '').toLowerCase().trim()
      if (!keyword) return { error: '请提供搜索关键词' }

      const home = await osHomeDir()
      // 快捷方式常见位置（开始菜单 + 桌面）
      const searchRoots = [
        'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
        home + '\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs',
        home + '\\Desktop',
        'C:\\Program Files',
        'C:\\Program Files (x86)'
      ]

      // 垃圾项过滤：卸载程序/更新器/帮助文档等绝不能当应用入口
      const isJunk = (lowerName: string): boolean =>
        /卸载|uninstall|uninst\d*|卸.*载/.test(lowerName) ||
        /readme|帮助|说明|help$/.test(lowerName.replace(/\.(lnk|exe)$/,''))

      // 匹配度打分（越高越优先）
      const score = (lowerName: string): number => {
        const base = lowerName.replace(/\.(lnk|exe)$/, '')
        if (base === keyword) return 100          // 完全同名
        if (base.startsWith(keyword)) return 85   // 以关键词开头
        if (lowerName.includes(keyword)) return 65 // 文件名包含关键词
        if (keyword.includes(base)) return 40     // 关键词包含文件名
        return 0
      }

      const found: Array<{ name: string; path: string, type: string, score: number }> = []
      const seen = new Map<string, number>() // name -> index，用于同名去重保留高分

      // 递归扫描（限制深度避免太慢）
      const scanDir = async (dir: string, depth: number) => {
        if (depth > 2 || found.length >= 20) return
        let entries: any
        try {
          entries = await fsReadDir(dir)
        } catch {
          return
        }
        if (!Array.isArray(entries)) return
        for (const e of entries) {
          if (found.length >= 20) break
          const lowerName = (e.name || '').toLowerCase()
          if (e.isFile && (lowerName.endsWith('.lnk') || lowerName.endsWith('.exe'))) {
            // 跳过卸载程序等垃圾项
            if (isJunk(lowerName)) continue
            const s = score(lowerName)
            if (s > 0) {
              const displayName = e.name.replace(/\.(lnk|exe)$/i, '')
              const prevIdx = seen.get(displayName)
              if (prevIdx !== undefined) {
                // 同名去重：保留得分高、路径短的
                if (s > found[prevIdx].score || (s === found[prevIdx].score && e.path.length < found[prevIdx].path.length)) {
                  found[prevIdx] = {
                    name: displayName,
                    path: e.path,
                    type: lowerName.endsWith('.lnk') ? 'shortcut' : 'executable',
                    score: s
                  }
                }
              } else {
                seen.set(displayName, found.length)
                found.push({
                  name: displayName,
                  path: e.path,
                  type: lowerName.endsWith('.lnk') ? 'shortcut' : 'executable',
                  score: s
                })
              }
            }
          } else if (e.isDirectory && depth < 2) {
            await scanDir(e.path, depth + 1)
          }
        }
      }

      for (const root of searchRoots) {
        await scanDir(root, 0)
      }

      // 按匹配度排序，最相关的排第一
      found.sort((a, b) => b.score - a.score || a.path.length - b.path.length)
      const top = found.slice(0, 10).map(({ score: _s, ...rest }) => rest)

      if (top.length === 0) {
        return {
          message: `未找到与「${params.keyword}」匹配的应用`,
          hint: '可尝试其他关键词（英文名），或让用户手动通过快速启动的「添加」按钮选择应用'
        }
      }
      return { apps: top, message: `找到 ${top.length} 个匹配的应用，已按匹配度排序` }
    }
  })

  // 查看快速启动列表
  registerTool({
    name: 'list_quick_launch',
    description: '查看当前快速启动项列表',
    parameters: [],
    execute: async () => {
      const result = await dbQuery("SELECT * FROM quick_launch ORDER BY position ASC")
      const items = result.data || []
      return {
        count: items.length,
        items: items.map((i: any) => ({ name: i.name, type: i.type, path: i.path }))
      }
    }
  })

  // 添加快速启动项
  registerTool({
    name: 'add_quick_launch',
    description: '添加快速启动项（应用/文件/文件夹/链接）。添加应用前应先用 search_apps 找到应用路径',
    parameters: [
      { name: 'name', type: 'string', description: '显示名称', required: true },
      { name: 'type', type: 'string', description: '类型: app/file/folder/link', required: true },
      { name: 'path', type: 'string', description: '应用路径(.lnk/.exe)、文件/文件夹路径或网址', required: true }
    ],
    execute: async (params) => {
      if (!params.name || !params.path || !params.type) {
        return { error: '需要提供 name、type、path 参数' }
      }
      const validTypes = ['app', 'file', 'folder', 'link']
      if (!validTypes.includes(params.type)) {
        return { error: `type 必须是 ${validTypes.join('/')} 之一` }
      }
      // 检查是否已存在同名项
      const existing = await dbQuery("SELECT * FROM quick_launch")
      const items = existing.data || []
      const dup = items.find((i: any) => i.name === params.name)
      if (dup) {
        return { message: `「${params.name}」已在快速启动中，无需重复添加` }
      }
      const id = uuidv4()
      await dbQuery(
        "INSERT INTO quick_launch (id, name, type, path, position) VALUES (?, ?, ?, ?, ?)",
        [id, params.name, params.type, params.path, items.length]
      )
      return {
        success: true,
        message: `已添加「${params.name}」到快速启动`,
        item: { name: params.name, type: params.type, path: params.path }
      }
    }
  })

  // 恢复壁纸（仅在用户反馈壁纸丢失时使用；只找回原文件，绝不更换图片）
  registerTool({
    name: 'restore_wallpaper',
    description: '恢复用户丢失的桌面壁纸。严格只找回用户原来的壁纸文件（按注册表记录的文件名精确匹配），绝不会更换成其他图片。找不到时返回提示让用户手动设置',
    parameters: [],
    execute: async () => {
      const wallpaperApi = (globalThis as any).window?.electronAPI?.wallpaper
      if (!wallpaperApi?.restore) {
        return { error: '壁纸恢复功能不可用' }
      }
      return await wallpaperApi.restore()
    }
  })

  // 移除快速启动项
  registerTool({
    name: 'remove_quick_launch',
    description: '按名称移除快速启动项',
    parameters: [
      { name: 'name', type: 'string', description: '要移除的快速启动项名称', required: true }
    ],
    execute: async (params) => {
      const existing = await dbQuery("SELECT * FROM quick_launch")
      const items = existing.data || []
      const target = items.find((i: any) => i.name === params.name)
      if (!target) {
        return { message: `快速启动中没有找到「${params.name}」` }
      }
      await dbQuery("DELETE FROM quick_launch WHERE id = ?", [target.id])
      return { success: true, message: `已从快速启动移除「${params.name}」` }
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

        // 受保护文件（壁纸/系统文件/快捷方式）不参与整理
        const wallpaperPaths = await getProtectedPaths()
        const allFiles = result.filter((f: any) => f.isFile)
        const skipped = allFiles.filter((f: any) => isProtectedFile(f, wallpaperPaths))
        const files = allFiles.filter((f: any) => !isProtectedFile(f, wallpaperPaths))
        const folders = result.filter((f: any) => f.isDirectory)
        
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
          protectedFiles: skipped.length,
          categories: Object.values(categories).filter(c => c.count > 0)
        }
        
        // 建议：只要有待整理文件就给出建议（不再用"超过3个才建议"的阈值）
        const suggestions: string[] = []
        for (const cat of stats.categories) {
          const folderExists = folders.some((f: any) => f.name === cat.name)
          const fileList = cat.files.length > 8
            ? cat.files.slice(0, 8).join('、') + ` 等 ${cat.files.length} 个文件`
            : cat.files.join('、')
          if (folderExists) {
            suggestions.push(`将「${fileList}」移入已有"${cat.name}"文件夹`)
          } else {
            suggestions.push(`创建"${cat.name}"文件夹，将「${fileList}」移入`)
          }
        }
        // 单独的文件夹不需要整理，仅提示
        if (suggestions.length === 0 && folders.length > 0) {
          suggestions.push('桌面文件均已分类整理，无需移动')
        }
        
        const protectedNote = skipped.length > 0 ? `（已保护 ${skipped.length} 个系统/壁纸/快捷方式文件）` : ''
        
        return {
          desktopPath,
          stats,
          suggestions,
          message: files.length > 0
            ? `发现 ${files.length} 个待整理文件${protectedNote}`
            : '桌面很整洁' + protectedNote
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
        const skipped: string[] = []
        
        // 受保护文件（壁纸/系统文件/快捷方式/隐藏文件）绝不移动
        const wallpaperPaths = await getProtectedPaths()
        const files = result.filter((f: any) => f.isFile && (() => {
          if (isProtectedFile(f, wallpaperPaths)) {
            skipped.push(f.name)
            return false
          }
          return true
        })())
        
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
          message: `已移动 ${moved.length} 个文件`
            + (skipped.length > 0 ? `，已保护 ${skipped.length} 个文件（壁纸/系统文件/快捷方式）` : ''),
          moved,
          skipped: skipped.length > 0 ? skipped : undefined,
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

可用工具(必须使用以下精确的工具名，并正确填写每个参数):
${toolsList.map(t => `- ${t.name}: ${t.description}
  参数: ${t.parameters.map(p => `${p.name}${p.required ? '(必填)' : '(可选)'}: ${p.description}`).join('; ') || '无'}`).join('\n')}

请按以下JSON格式分析并规划任务:
{
  "thought": "你的思考过程",
  "steps": [
    {
      "id": 1,
      "description": "步骤描述",
      "tool": "工具名",
      "params": {"参数名": "实际值"}
    }
  ],
  "needsExecution": true
}

示例 - 用户请求"把网易云音乐加到快速启动":
{
  "thought": "需要先搜索应用路径，再添加到快速启动",
  "steps": [
    {"id": 1, "description": "搜索网易云音乐的安装路径", "tool": "search_apps", "params": {"keyword": "网易云音乐"}},
    {"id": 2, "description": "将网易云音乐添加到快速启动", "tool": "add_quick_launch", "params": {"name": "网易云音乐", "type": "app", "path": null}}
  ],
  "needsExecution": true
}

参数填写规则:
- params 必须填写实际值，不能省略必填参数
- 如果参数依赖上一步的执行结果(如搜索到的应用路径)，该参数填 null，系统会自动使用上一步的结果
- 从用户请求中提取参数值（如应用名、链接地址、任务标题）

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
10. 用户问"收藏了什么链接/我的链接/搜链接"时，用search_links（不带keyword即可列出全部）
10. 桌面路径直接使用: "C:\\\\Users\\\\dot backup\\\\Desktop" (Windows默认桌面)
11. 用户主目录是: "C:\\\\Users\\\\dot backup"
12. 整理桌面文件用 organize_desktop 工具，它会自动获取桌面路径
13. 如果需要分析桌面文件并整理，直接调用 organize_desktop 或 execute_organize_desktop 工具
14. 添加应用到快速启动的标准流程: 第一步 search_apps 搜索应用路径，第二步 add_quick_launch 添加(type="app"，path用搜索到的.lnk或.exe路径)
15. 查看快速启动内容用 list_quick_launch；移除用 remove_quick_launch
16. 添加网址到快速启动直接用 add_quick_launch(type="link")，无需搜索
17. 整理桌面会自动保护壁纸、系统文件(desktop.ini)和快捷方式(.lnk)，这些文件不会被移动，无需额外处理
18. 壁纸原则: 绝不更换用户的壁纸或主题。整理桌面会自动保护壁纸、主题文件(.theme)和快捷方式。只有当用户主动反馈壁纸变黑/丢失时才调用 restore_wallpaper（它只会找回用户原来的壁纸文件，不会换图）；找不到时提醒用户自行在"个性化"中设置
19. 创建子任务的标准流程: 第一步 search_tasks 查找父任务(参数keyword用父任务名)，第二步 create_task(title=子任务名, parent_task_id=第一步找到的父任务id)

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
        params: s.params || s.parameters || {},
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
  
  // 从用户请求中提取应用/项目名称（去掉动作词）
  const extractName = (input: string): string | null => {
    const patterns = [
      /(?:把|将|添加|加入?)\s*["「『]?(.+?)["」』]?\s*(?:加到|加入|添加到|放到|放至|移到|设置|设为|创建为|到)/,
      /(?:打开|启动|运行|搜索|查找|查看)\s*["「『]?(.+?)["」』]?\s*(?:的|应用|程序|文件|链接|任务|$)/,
    ]
    for (const p of patterns) {
      const m = input.match(p)
      if (m && m[1] && m[1].length <= 30) {
        return m[1].replace(/(应用|程序|到快速启动|快速启动)/g, '').trim()
      }
    }
    return null
  }
  
  // 从用户请求中提取父任务名（"给X加子任务"、"在X下创建子任务"、"给X添加三个子任务"）
  const extractParentName = (input: string): string | null => {
    const patterns = [
      /(?:给|为|在|对)\s*["「『]?(.+?)["」』]?\s*(?:加|创建|新建|添加)\s*(?:[一二两三四五六七八九十百\d]+个|一个|个|多个|数个)?\s*子任务/,
      /(?:给|为|在|对)\s*["「『]?(.+?)["」』]?\s*(?:加|创建|新建|添加)\s*(?:[一二两三四五六七八九十百\d]+个|一个|个|多个|数个)?\s*下级任务/,
    ]
    for (const p of patterns) {
      const m = input.match(p)
      if (m && m[1] && m[1].length <= 30) {
        return m[1].replace(/^(在|给|为|对)/, '').replace(/(下|里|中|下面)$/, '').trim()
      }
    }
    return null
  }
  
  // 在已执行步骤结果中查找父任务
  const findParentInSteps = (parentName: string): string | null => {
    const lower = parentName.toLowerCase()
    for (const s of steps) {
      const outputs = Array.isArray(s.output) ? s.output : s.output?.items
      if (Array.isArray(outputs)) {
        for (const t of outputs) {
          const title = t?.title ? String(t.title) : ''
          if (title && (title.toLowerCase().includes(lower) || lower.includes(title.toLowerCase()))) {
            return t.id || null
          }
        }
      }
    }
    return null
  }
  
  // 参数兜底推断：缺失的必填参数从用户请求或上一步结果中补全
  const inferParams = async (toolName: string, rawParams: Record<string, any>): Promise<Record<string, any>> => {
    const params = { ...rawParams }
    const userInput = plan.task || ''
    const name = extractName(userInput)
    
    // 清理 null 和占位符值（模型按规则填 null，或不守规则填说明文字）
    for (const k of Object.keys(params)) {
      const v = params[k]
      if (v === null || v === undefined) {
        delete params[k]
      } else if (typeof v === 'string' && (
        /^\(.*\)$/.test(v.trim()) ||          // (使用第1步结果)
        /第\s*\d+\s*步/.test(v) ||            // 第1步的结果
        /上一步|搜索到|待定|unknown|todo/i.test(v)
      )) {
        delete params[k]
      }
    }
    
    if (toolName === 'search_apps' && !params.keyword) {
      params.keyword = name || userInput.slice(0, 20)
    }
    
    if (toolName === 'add_quick_launch') {
      if (!params.name) params.name = name || userInput.slice(0, 20)
      if (!params.type) {
        if (/链接|网址|http/i.test(userInput)) params.type = 'link'
        else if (/文件夹|目录/.test(userInput)) params.type = 'folder'
        else if (/文件/.test(userInput)) params.type = 'file'
        else params.type = 'app'
      }
      if (!params.path) {
        // 从之前步骤的 search_apps 结果中取应用路径
        for (const s of steps) {
          if (s.output?.apps?.length > 0) {
            params.path = s.output.apps[0].path
            if (!params.name || params.name === userInput.slice(0, 20)) {
              params.name = s.output.apps[0].name
            }
            break
          }
        }
      }
    }
    
    // 创建子任务：自动补全父任务ID
    if (toolName === 'create_task' && !params.parent_task_id && /子任务|下级任务/.test(userInput)) {
      const parentName = extractParentName(userInput) || name
      if (parentName) {
        // 1. 从之前 search_tasks 步骤的结果中找
        let parentId = findParentInSteps(parentName)
        // 2. 兜底：直接查数据库按标题匹配
        if (!parentId && (globalThis as any).window?.electronAPI?.db) {
          try {
            const res = await (globalThis as any).window.electronAPI.db.query("SELECT * FROM tasks")
            const allTasks = res.data || []
            const lower = parentName.toLowerCase()
            const match = allTasks.find((t: any) =>
              t.title && (String(t.title).toLowerCase().includes(lower) || lower.includes(String(t.title).toLowerCase()))
            )
            if (match) parentId = match.id
          } catch {
            // 查询失败则跳过
          }
        }
        if (parentId) {
          params.parent_task_id = parentId
        }
      }
    }
    
    return params
  }
  
  for (const step of plan.steps) {
    if (!step.tool) continue
    
    step.status = 'executing'
    const finalParams = await inferParams(step.tool, step.params || {})
    
    try {
      const result = await executeTool(step.tool, finalParams)
      step.status = result.success ? 'completed' : 'failed'
      step.result = result.success ? result.data : undefined
      step.error = result.error
      
      steps.push({
        tool: step.tool,
        input: finalParams,
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
