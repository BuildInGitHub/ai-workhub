// v2 工具集合 —— 完整移植 v1 initBuiltinTools 里的 20+ 工具到 Pi AgentTool 格式
// 业务逻辑（关键词过滤、search_apps 评分、桌面整理保护路径）完整保留
// 区别：Pi 的 Tool.parameters 是 TypeBox schema，不是 v1 的数组

import { v4 as uuidv4 } from 'uuid'
import { Type, type Static } from '@earendil-works/pi-ai'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { defineTool, safeJsonText } from './base'
import type { ToolContext } from '../types'

// ===== 通用 schema =====
const empty = Type.Object({})

// ============ 任务 ============
export const searchTasksTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_tasks',
  label: '搜索任务',
  description: '搜索任务列表。keyword 模糊匹配标题/描述，status=active 表示未完成，status=completed 表示已完成',
  parameters: Type.Object({
    keyword: Type.Optional(Type.String({ description: '搜索关键词' })),
    status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('completed')], { description: '任务状态' })),
  }),
  execute: async (_c, params) => {
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const queryParams: any[] = []
    if (params.keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)'
      queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`)
    }
    if (params.status === 'active') sql += ' AND completed = 0'
    else if (params.status === 'completed') sql += ' AND completed = 1'
    sql += ' ORDER BY created_at DESC LIMIT 10'
    const result = await ctx.dbQuery(sql, queryParams)
    return { content: [{ type: 'text', text: safeJsonText(result.data || []) }], details: result.data || [] }
  },
})

export const createTaskTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'create_task',
  label: '创建任务',
  description: '创建新任务（支持作为子任务）。先 search_tasks 查找父任务得到 ID，再传 parent_task_id',
  parameters: Type.Object({
    title: Type.String({ description: '任务标题' }),
    description: Type.Optional(Type.String({ description: '任务描述' })),
    priority: Type.Optional(Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')])),
    start_date: Type.Optional(Type.String({ description: '开始日期 YYYY-MM-DD' })),
    due_date: Type.Optional(Type.String({ description: '截止日期 YYYY-MM-DD' })),
    status: Type.Optional(Type.Union([Type.Literal('todo'), Type.Literal('doing'), Type.Literal('done')])),
    parent_task_id: Type.Optional(Type.String({ description: '父任务ID' })),
  }),
  execute: async (_c, params) => {
    const id = uuidv4()
    const status = ['todo', 'doing', 'done'].includes(params.status as string) ? params.status : 'todo'
    const completed = status === 'done' ? 1 : 0
    await ctx.dbQuery(
      "INSERT INTO tasks (id, title, description, priority, start_date, due_date, completed, status, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
      [id, params.title, params.description || '', params.priority || 'medium', params.start_date || null, params.due_date || null, completed, status, params.parent_task_id || null]
    )
    return { content: [{ type: 'text', text: JSON.stringify({ id, title: params.title, status, message: '任务创建成功' }) }], details: { id, title: params.title, status } }
  },
})

export const completeTaskTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'complete_task',
  label: '完成/取消任务',
  description: '切换任务完成状态',
  parameters: Type.Object({
    task_id: Type.String({ description: '任务ID' }),
    completed: Type.Optional(Type.Boolean({ description: '是否完成，默认 true' })),
  }),
  execute: async (_c, params) => {
    await ctx.dbQuery("UPDATE tasks SET completed = ?, updated_at = datetime('now') WHERE id = ?", [params.completed !== false ? 1 : 0, params.task_id])
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], details: { success: true } }
  },
})

// ============ 链接 ============
export const searchLinksTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_links',
  label: '搜索链接',
  description: '搜索已收藏的链接，keyword 可模糊匹配标题/URL/描述',
  parameters: Type.Object({
    keyword: Type.Optional(Type.String({ description: '搜索关键词（可选，留空则列出全部）' })),
    limit: Type.Optional(Type.Number({ description: '返回数量' })),
  }),
  execute: async (_c, params) => {
    const limit = params.limit ?? 10
    let sql = 'SELECT * FROM links'
    const queryParams: any[] = []
    if (params.keyword) {
      sql += ' WHERE (title LIKE ? OR url LIKE ? OR description LIKE ?)'
      const k = `%${params.keyword}%`
      queryParams.push(k, k, k)
    }
    sql += ' ORDER BY created_at DESC LIMIT ?'
    queryParams.push(limit)
    const result = await ctx.dbQuery(sql, queryParams)
    return { content: [{ type: 'text', text: safeJsonText(result.data || []) }], details: result.data || [] }
  },
})

export const addLinkTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'add_link',
  label: '添加链接',
  description: '添加一个新链接收藏',
  parameters: Type.Object({
    title: Type.String({ description: '链接标题' }),
    url: Type.String({ description: '链接地址' }),
    description: Type.Optional(Type.String()),
    category: Type.Optional(Type.String()),
    account: Type.Optional(Type.String({ description: '账号' })),
    password_hint: Type.Optional(Type.String({ description: '密码提示（不要存明文）' })),
  }),
  execute: async (_c, params) => {
    const id = uuidv4()
    await ctx.dbQuery(
      "INSERT INTO links (id, title, url, description, category, account, password_hint, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
      [id, params.title, params.url, params.description || '', params.category || '其他', params.account || '', params.password_hint || '']
    )
    return { content: [{ type: 'text', text: JSON.stringify({ id, title: params.title, message: '链接已收藏' }) }], details: { id, title: params.title } }
  },
})

export const openUrlTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'open_url',
  label: '打开链接',
  description: '在浏览器中打开 URL',
  parameters: Type.Object({ url: Type.String() }),
  execute: async (_c, params) => {
    const r = await ctx.shellOpenExternal(params.url)
    return { content: [{ type: 'text', text: r.success ? '已打开' : `打开失败: ${r.error}` }], details: r }
  },
})

// ============ 文件 ============
export const browseDirectoryTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'browse_directory',
  label: '浏览目录',
  description: '列出指定目录下的文件与文件夹',
  parameters: Type.Object({ path: Type.String({ description: '目录绝对路径' }) }),
  execute: async (_c, params) => {
    const r = await ctx.fsReadDir(params.path)
    return { content: [{ type: 'text', text: safeJsonText(r.data || []) }], details: r.data || [] }
  },
})

export const readFileTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'read_file',
  label: '读取文件',
  description: '读取文本文件内容（仅文本文件）',
  parameters: Type.Object({ path: Type.String() }),
  execute: async (_c, params) => {
    const r = await ctx.fsReadFile(params.path)
    const text = typeof r.data === 'string' ? r.data : safeJsonText(r.data)
    return { content: [{ type: 'text', text: text.slice(0, 5000) }], details: r.data }
  },
})

export const getHomeDirectoryTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'get_home_directory',
  label: '获取主目录',
  description: '返回用户主目录路径',
  parameters: empty,
  execute: async () => {
    const r = await ctx.osHomeDir()
    const home = (r as any).data || r
    return { content: [{ type: 'text', text: home }], details: { home } }
  },
})

// ============ 搜索应用 ============
interface AppHit { name: string; path: string; type?: string }
function scoreApp(name: string, lower: string): number {
  const n = name.toLowerCase()
  if (n === lower) return 100
  if (n.startsWith(lower)) return 85
  if (n.includes(lower)) return 65
  return 0
}
export const searchAppsTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_apps',
  label: '搜索应用',
  description: '在开始菜单/桌面/Program Files 中搜索应用，排除卸载程序，按相关度排序',
  parameters: Type.Object({ keyword: Type.String({ description: '应用名称关键词' }) }),
  execute: async (_c, params) => {
    const lower = params.keyword.toLowerCase()
    const home = (await ctx.osHomeDir() as any).data
    const searchRoots = [
      `${home}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs`,
      `${home}\\Desktop`,
      `C:\\Program Files`,
      `C:\\Program Files (x86)`,
    ]
    const found: AppHit[] = []
    const seen = new Set<string>()
    const MAX_DEPTH = 2
    const scan = async (dir: string, depth: number) => {
      if (depth > MAX_DEPTH) return
      try {
        const r = await ctx.fsReadDir(dir)
        const items = (r.data || []) as any[]
        for (const it of items) {
          const name = String(it.name || '')
          if (!name) continue
          // 排除卸载/卸载程序
          const ln = name.toLowerCase()
          if (ln.includes('卸载') || ln.includes('uninstall')) continue
          if (it.isFile && (ln.endsWith('.lnk') || ln.endsWith('.exe'))) {
            const fullPath = it.path || `${dir}\\${name}`
            if (seen.has(fullPath)) continue
            if (ln.includes(lower) || lower.includes(ln.replace(/\.(lnk|exe)$/, ''))) {
              const sc = scoreApp(name.replace(/\.(lnk|exe)$/, ''), lower)
              if (sc > 0) {
                seen.add(fullPath)
                found.push({ name: name.replace(/\.(lnk|exe)$/, ''), path: fullPath, type: 'app' })
              }
            }
          } else if (it.isDirectory) {
            await scan(it.path || `${dir}\\${name}`, depth + 1)
          }
        }
      } catch { /* 权限/不存在 跳过 */ }
    }
    for (const root of searchRoots) await scan(root, 0)
    found.sort((a, b) => scoreApp(b.name, lower) - scoreApp(a.name, lower))
    return { content: [{ type: 'text', text: safeJsonText(found.slice(0, 10)) }], details: found.slice(0, 10) }
  },
})

// ============ 快速启动 ============
export const listQuickLaunchTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'list_quick_launch',
  label: '列出快速启动',
  description: '查看所有快速启动项（应用、文件、文件夹、链接）',
  parameters: empty,
  execute: async () => {
    const r = await ctx.dbQuery('SELECT * FROM quick_launch ORDER BY position ASC')
    return { content: [{ type: 'text', text: safeJsonText({ count: (r.data || []).length, items: r.data || [] }) }], details: { count: (r.data || []).length, items: r.data || [] } }
  },
})

export const addQuickLaunchTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'add_quick_launch',
  label: '添加快速启动',
  description: '添加快速启动项。type 必须是 app/file/folder/link 之一',
  parameters: Type.Object({
    name: Type.String({ description: '显示名称' }),
    type: Type.String({ description: 'app | file | folder | link' }),
    path: Type.String({ description: '应用路径/文件路径/链接URL' }),
  }),
  execute: async (_c, params) => {
    const validTypes = ['app', 'file', 'folder', 'link']
    if (!validTypes.includes(params.type)) return { content: [{ type: 'text', text: `type 必须是 ${validTypes.join('/')} 之一` }], details: { error: `type 必须是 ${validTypes.join('/')} 之一` } }
    // 防卸载程序
    const ln = params.name.toLowerCase()
    if (ln.includes('卸载') || ln.includes('uninstall')) {
      return { content: [{ type: 'text', text: '禁止添加卸载程序' }], details: { error: '禁止添加卸载程序' } }
    }
    // 同名去重
    const dup = await ctx.dbQuery('SELECT id FROM quick_launch WHERE name = ?', [params.name])
    if (dup.data && dup.data.length > 0) {
      return { content: [{ type: 'text', text: '已存在同名快速启动项' }], details: { error: 'duplicate', existing: true } }
    }
    const id = uuidv4()
    // 取最大 position
    const maxPos = await ctx.dbQuery('SELECT MAX(position) as max FROM quick_launch')
    const nextPos = ((maxPos.data?.[0] as any)?.max ?? -1) + 1
    await ctx.dbQuery('INSERT INTO quick_launch (id, name, type, path, position) VALUES (?, ?, ?, ?, ?)', [id, params.name, params.type, params.path, nextPos])
    return { content: [{ type: 'text', text: JSON.stringify({ id, message: `已添加: ${params.name}` }) }], details: { id, name: params.name } }
  },
})

export const removeQuickLaunchTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'remove_quick_launch',
  label: '移除快速启动',
  description: '从快速启动移除一项（按名称）',
  parameters: Type.Object({ name: Type.String() }),
  execute: async (_c, params) => {
    await ctx.dbQuery('DELETE FROM quick_launch WHERE name = ?', [params.name])
    return { content: [{ type: 'text', text: '已移除' }], details: { success: true } }
  },
})

// ============ 壁纸 ============
export const restoreWallpaperTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'restore_wallpaper',
  label: '恢复壁纸',
  description: '找回被误移走的壁纸文件并恢复。仅在用户反馈壁纸变黑/丢失时调用',
  parameters: empty,
  execute: async () => {
    try {
      const r = await ctx.restoreWallpaper()
      return { content: [{ type: 'text', text: r.message || '已尝试恢复' }], details: r }
    } catch (e: any) {
      return { content: [{ type: 'text', text: `恢复失败: ${e.message}` }], details: { error: e.message } }
    }
  },
})

// ============ 桌面整理 ============
interface DesktopItem { name: string; path: string; isFile?: boolean; isDirectory?: boolean; isShortcut?: boolean }
function isProtectedDesktopItem(name: string, filePath: string, wallpaperPaths: Set<string>): boolean {
  const ln = name.toLowerCase()
  if (ln === 'desktop.ini' || ln === 'thumbs.db') return true
  if (ln.startsWith('.')) return true
  if (ln.endsWith('.lnk') || ln.endsWith('.url')) return true
  if (ln.endsWith('.theme') || ln.endsWith('.themepack') || ln.endsWith('.deskthemepack')) return true
  if (wallpaperPaths.has(filePath.toLowerCase())) return true
  return false
}
const CATEGORY_FOLDERS: Record<string, string[]> = {
  '文档': ['.doc', '.docx', '.pdf', '.txt', '.md', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'],
  '图片': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.heic'],
  '视频': ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm'],
  '音频': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
  '压缩包': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
  '程序': ['.exe', '.msi'],
  '代码': ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.json', '.html', '.css', '.vue', '.tsx', '.jsx'],
}
function categorizeByExt(name: string): string | null {
  const ln = name.toLowerCase()
  for (const [cat, exts] of Object.entries(CATEGORY_FOLDERS)) {
    if (exts.some(e => ln.endsWith(e))) return cat
  }
  return null
}

export const organizeDesktopTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'organize_desktop',
  label: '分析桌面',
  description: '扫描桌面文件并生成分类建议（不移动任何文件）',
  parameters: empty,
  execute: async () => {
    const home = (await ctx.osHomeDir() as any).data
    const desktopPath = `${home}\\Desktop`
    const r = await ctx.fsReadDir(desktopPath)
    const items = (r.data || []) as DesktopItem[]
    let wallpaperPath = ''
    try { wallpaperPath = await ctx.getWallpaper() } catch {}
    const protectedPaths = wallpaperPath ? new Set([wallpaperPath.toLowerCase()]) : new Set<string>()
    const suggestions: { name: string; target: string; category: string }[] = []
    let totalFiles = 0, totalFolders = 0
    for (const it of items) {
      const name = String(it.name || '')
      const filePath = String(it.path || `${desktopPath}\\${name}`)
      if (!it.isFile) { totalFolders++; continue }
      totalFiles++
      if (isProtectedDesktopItem(name, filePath, protectedPaths)) continue
      const cat = categorizeByExt(name)
      if (cat) suggestions.push({ name, target: `${desktopPath}\\${cat}\\${name}`, category: cat })
      else suggestions.push({ name, target: `${desktopPath}\\其他\\${name}`, category: '其他' })
    }
    return {
      content: [{ type: 'text', text: safeJsonText({ desktopPath, stats: { totalFiles, totalFolders }, suggestions }) }],
      details: { desktopPath, stats: { totalFiles, totalFolders }, suggestions },
    }
  },
})

export const executeOrganizeDesktopTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'execute_organize_desktop',
  label: '执行桌面整理',
  description: '真正执行桌面文件分类移动。会自动跳过壁纸/系统文件/.lnk/.theme/.themepack',
  parameters: empty,
  execute: async () => {
    if (!ctx.fsMoveFile) return { content: [{ type: 'text', text: '移动文件功能未启用' }], details: { error: 'fsMoveFile not provided' } }
    const home = (await ctx.osHomeDir() as any).data
    const desktopPath = `${home}\\Desktop`
    const r = await ctx.fsReadDir(desktopPath)
    const items = (r.data || []) as DesktopItem[]
    let wallpaperPath = ''
    try { wallpaperPath = await ctx.getWallpaper() } catch {}
    const protectedPaths = wallpaperPath ? new Set([wallpaperPath.toLowerCase()]) : new Set<string>()
    const moved: string[] = []
    const skipped: string[] = []
    for (const it of items) {
      const name = String(it.name || '')
      const filePath = String(it.path || `${desktopPath}\\${name}`)
      if (!it.isFile) continue
      if (isProtectedDesktopItem(name, filePath, protectedPaths)) { skipped.push(name); continue }
      const cat = categorizeByExt(name) || '其他'
      const dest = `${desktopPath}\\${cat}\\${name}`
      try {
        const mr = await ctx.fsMoveFile(filePath, dest)
        if (mr.success) moved.push(name)
        else skipped.push(`${name}(${mr.error})`)
    } catch (e: any) {
        skipped.push(`${name}(${e.message})`)
      }
    }
    return { content: [{ type: 'text', text: safeJsonText({ moved: moved.length, skipped: skipped.length, movedItems: moved }) }], details: { moved: moved.length, skipped: skipped.length, movedItems: moved } }
  },
})

// ============ 记忆 ============
export const saveMemoryTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'save_memory',
  label: '保存长期记忆',
  description: '用户说"记住X"/"以后要X"/"别忘了X"时使用，把信息存为长期记忆',
  parameters: Type.Object({ content: Type.String({ description: '记忆内容，一句话概括' }) }),
  execute: async (_c, params) => {
    const id = uuidv4()
    await ctx.dbQuery("INSERT INTO memories (id, content, source, created_at) VALUES (?, ?, ?, datetime('now'))", [id, params.content, 'user'])
    return { content: [{ type: 'text', text: `已记住: ${params.content}` }], details: { id, content: params.content } }
  },
})

export const searchMemoryTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_memory',
  label: '搜索长期记忆',
  description: '查询长期记忆库',
  parameters: Type.Object({ keyword: Type.Optional(Type.String({ description: '搜索关键词' })) }),
  execute: async (_c, params) => {
    let sql = 'SELECT * FROM memories'
    const queryParams: any[] = []
    if (params.keyword) {
      sql += ' WHERE content LIKE ?'
      queryParams.push(`%${params.keyword}%`)
    }
    sql += ' ORDER BY created_at DESC LIMIT 20'
    const r = await ctx.dbQuery(sql, queryParams)
    return { content: [{ type: 'text', text: safeJsonText({ count: (r.data || []).length, items: r.data || [] }) }], details: { count: (r.data || []).length, items: r.data || [] } }
  },
})

// ============ 收藏文件/日历/项目/笔记/计算 ============
export const listFavoriteFilesTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'list_favorite_files',
  label: '收藏的文件',
  description: '列出已收藏的文件',
  parameters: empty,
  execute: async () => {
    const r = await ctx.dbQuery('SELECT * FROM favorite_files ORDER BY created_at DESC LIMIT 50')
    return { content: [{ type: 'text', text: safeJsonText(r.data || []) }], details: r.data || [] }
  },
})

export const searchCalendarTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_calendar',
  label: '搜索日历事件',
  description: '查询日历事件（按日期范围或关键词）',
  parameters: Type.Object({
    keyword: Type.Optional(Type.String()),
    from_date: Type.Optional(Type.String()),
    to_date: Type.Optional(Type.String()),
  }),
  execute: async (_c, params) => {
    let sql = 'SELECT * FROM calendar_events WHERE 1=1'
    const queryParams: any[] = []
    if (params.keyword) { sql += ' AND (title LIKE ? OR description LIKE ?)'; queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`) }
    if (params.from_date) { sql += ' AND date >= ?'; queryParams.push(params.from_date) }
    if (params.to_date) { sql += ' AND date <= ?'; queryParams.push(params.to_date) }
    sql += ' ORDER BY date ASC LIMIT 20'
    const r = await ctx.dbQuery(sql, queryParams)
    return { content: [{ type: 'text', text: safeJsonText(r.data || []) }], details: r.data || [] }
  },
})

export const createCalendarEventTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'create_calendar_event',
  label: '创建日历事件',
  description: '创建一条日程',
  parameters: Type.Object({
    title: Type.String(),
    date: Type.String({ description: 'YYYY-MM-DD' }),
    time: Type.Optional(Type.String({ description: 'HH:MM' })),
    description: Type.Optional(Type.String()),
    type: Type.Optional(Type.String()),
  }),
  execute: async (_c, params) => {
    const id = uuidv4()
    await ctx.dbQuery("INSERT INTO calendar_events (id, title, date, time, type, description, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))", [id, params.title, params.date, params.time || '', params.type || 'event', params.description || ''])
    return { content: [{ type: 'text', text: JSON.stringify({ id, message: '日程已创建' }) }], details: { id, title: params.title } }
  },
})

export const searchProjectsTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_projects',
  label: '搜索项目',
  description: '查询项目',
  parameters: Type.Object({ keyword: Type.Optional(Type.String()) }),
  execute: async (_c, params) => {
    let sql = 'SELECT * FROM projects'
    const queryParams: any[] = []
    if (params.keyword) { sql += ' WHERE name LIKE ?'; queryParams.push(`%${params.keyword}%`) }
    sql += ' ORDER BY created_at DESC LIMIT 20'
    const r = await ctx.dbQuery(sql, queryParams)
    return { content: [{ type: 'text', text: safeJsonText(r.data || []) }], details: r.data || [] }
  },
})

export const createProjectTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'create_project',
  label: '创建项目',
  description: '创建一个新项目',
  parameters: Type.Object({
    name: Type.String(),
    description: Type.Optional(Type.String()),
    color: Type.Optional(Type.String()),
  }),
  execute: async (_c, params) => {
    const id = uuidv4()
    await ctx.dbQuery("INSERT INTO projects (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))", [id, params.name, params.description || '', params.color || 'blue'])
    return { content: [{ type: 'text', text: JSON.stringify({ id, message: '项目已创建' }) }], details: { id, name: params.name } }
  },
})

export const quickNoteTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'quick_note',
  label: '快速笔记',
  description: '写一条快速笔记',
  parameters: Type.Object({
    title: Type.String(),
    content: Type.String(),
  }),
  execute: async (_c, params) => {
    const id = uuidv4()
    await ctx.dbQuery("INSERT INTO quick_notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))", [id, params.title, params.content])
    return { content: [{ type: 'text', text: JSON.stringify({ id, message: '笔记已保存' }) }], details: { id, title: params.title } }
  },
})

export const searchNotesTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'search_notes',
  label: '搜索笔记',
  description: '搜索快速笔记',
  parameters: Type.Object({ keyword: Type.Optional(Type.String()) }),
  execute: async (_c, params) => {
    let sql = 'SELECT * FROM quick_notes'
    const queryParams: any[] = []
    if (params.keyword) { sql += ' WHERE (title LIKE ? OR content LIKE ?)'; queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`) }
    sql += ' ORDER BY created_at DESC LIMIT 20'
    const r = await ctx.dbQuery(sql, queryParams)
    return { content: [{ type: 'text', text: safeJsonText(r.data || []) }], details: r.data || [] }
  },
})

export const calculateTool = (ctx: ToolContext) => defineTool(ctx, {
  name: 'calculate',
  label: '计算器',
  description: '计算数学表达式（仅支持纯数学表达式）',
  parameters: Type.Object({ expression: Type.String({ description: '数学表达式，如 2+3*4' }) }),
  execute: async (_c, params) => {
    // 严格白名单：仅数字 / 运算符 / 括号 / 空白
    const expr = String(params.expression || '')
    if (!/^[\d+\-*/().\s]+$/.test(expr)) {
      return { content: [{ type: 'text', text: '表达式非法：仅支持数字与 + - * / ( )' }], details: { error: 'illegal expression' } }
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)()
      return { content: [{ type: 'text', text: String(result) }], details: { result } }
    } catch (e: any) {
      return { content: [{ type: 'text', text: `计算错误: ${e.message}` }], details: { error: e.message } }
    }
  },
})

// 汇总：返回全部工具
export function buildAllTools(ctx: ToolContext): AgentTool[] {
  return [
    searchTasksTool(ctx),
    createTaskTool(ctx),
    completeTaskTool(ctx),
    searchLinksTool(ctx),
    addLinkTool(ctx),
    openUrlTool(ctx),
    browseDirectoryTool(ctx),
    readFileTool(ctx),
    getHomeDirectoryTool(ctx),
    searchAppsTool(ctx),
    listQuickLaunchTool(ctx),
    addQuickLaunchTool(ctx),
    removeQuickLaunchTool(ctx),
    restoreWallpaperTool(ctx),
    organizeDesktopTool(ctx),
    executeOrganizeDesktopTool(ctx),
    saveMemoryTool(ctx),
    searchMemoryTool(ctx),
    listFavoriteFilesTool(ctx),
    searchCalendarTool(ctx),
    createCalendarEventTool(ctx),
    searchProjectsTool(ctx),
    createProjectTool(ctx),
    quickNoteTool(ctx),
    searchNotesTool(ctx),
    calculateTool(ctx),
  ]
}