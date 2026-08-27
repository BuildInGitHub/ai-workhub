import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import Database from 'better-sqlite3'

// ===========================
// SQLite 数据库（better-sqlite3）
// 首次运行自动从旧 JSON 文件迁移数据
// ===========================

let db: Database.Database | null = null
let dbPath: string = ''
let jsonPath: string = ''

// 所有表的建表语句（列名与旧 JSON 字段一一对应）
const TABLES: Record<string, string> = {
  links: `id TEXT PRIMARY KEY, title TEXT, url TEXT, description TEXT, tags TEXT,
          category TEXT, account TEXT, password_hint TEXT, favicon TEXT,
          created_at TEXT, updated_at TEXT`,
  favorite_files: `id TEXT PRIMARY KEY, name TEXT, path TEXT, type TEXT, size INTEGER, created_at TEXT`,
  tasks: `id TEXT PRIMARY KEY, title TEXT, description TEXT, completed INTEGER DEFAULT 0,
          priority TEXT, due_date TEXT, parent_id TEXT, status TEXT, position INTEGER,
          created_at TEXT, updated_at TEXT`,
  chat_history: `id TEXT PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, created_at TEXT`,
  sessions: `id TEXT PRIMARY KEY, title TEXT, created_at TEXT, updated_at TEXT`,
  projects: `id TEXT PRIMARY KEY, name TEXT, description TEXT, color TEXT, created_at TEXT, updated_at TEXT`,
  project_items: `id TEXT PRIMARY KEY, project_id TEXT, item_type TEXT, item_id TEXT, created_at TEXT`,
  settings: `id TEXT PRIMARY KEY, key TEXT, value TEXT, created_at TEXT`,
  quick_launch: `id TEXT PRIMARY KEY, name TEXT, type TEXT, path TEXT, position INTEGER`,
  calendar_events: `id TEXT PRIMARY KEY, title TEXT, date TEXT, time TEXT, type TEXT, description TEXT, created_at TEXT`,
  quick_notes: `id TEXT PRIMARY KEY, title TEXT, content TEXT, created_at TEXT`
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'ai-workhub.db')
  jsonPath = path.join(userDataPath, 'ai-workhub-data.json')

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  const isNewDb = !fs.existsSync(dbPath)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // 建表
  for (const [name, schema] of Object.entries(TABLES)) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${schema})`)
  }

  // 首次创建且存在旧 JSON 数据 → 自动迁移
  if (isNewDb && fs.existsSync(jsonPath)) {
    try {
      migrateFromJson()
    } catch (error: any) {
      console.error('[Database] JSON 迁移失败:', error.message)
    }
  }

  console.log('[Database] SQLite initialized at:', dbPath)
}

// 从旧 JSON 文件迁移数据到 SQLite（迁移后 JSON 改名保留为备份）
function migrateFromJson(): void {
  if (!db) return
  const raw = fs.readFileSync(jsonPath, 'utf-8')
  const json = JSON.parse(raw)
  if (!json || typeof json !== 'object') return

  let total = 0
  for (const [table, schema] of Object.entries(TABLES)) {
    const rows = (json as any)[table]
    if (!Array.isArray(rows) || rows.length === 0) continue

    // 用所有行的字段并集确定插入列（不能用第一行，否则漏字段如 parent_id/position）
    const allKeys = new Set<string>()
    for (const r of rows) Object.keys(r).forEach(k => allKeys.add(k))
    const insertCols = Array.from(allKeys).filter(c => schema.includes(c))
    if (insertCols.length === 0) continue

    const insert = db.prepare(
      `INSERT OR IGNORE INTO ${table} (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`
    )
    const tx = db.transaction((items: any[]) => {
      for (const item of items) {
        const values = insertCols.map(c => item[c] ?? null)
        insert.run(...values)
      }
    })
    tx(rows)
    total += rows.length
    console.log(`[Database] 迁移 ${table}: ${rows.length} 条`)
  }

  // 迁移完成，旧 JSON 改名保留（不删除）
  const backupJsonPath = jsonPath + '.bak'
  if (fs.existsSync(backupJsonPath)) fs.unlinkSync(backupJsonPath)
  fs.renameSync(jsonPath, backupJsonPath)
  console.log(`[Database] JSON 迁移完成，共 ${total} 条，原文件保留为 ${path.basename(backupJsonPath)}`)
}

// 统一的查询入口（与旧的迷你解析器接口一致，现在是真实 SQL）
export function runQuery(sql: string, params?: any[]): any {
  console.log('[DB] Query:', sql, 'Params:', params)
  if (!db) return { error: '数据库未初始化' }

  const cleanParams = (params || []).map(p => p === undefined ? null : p)

  try {
    const stmt = db.prepare(sql)

    if (/^\s*select\b/i.test(sql)) {
      return { data: stmt.all(...cleanParams) }
    }
    if (/^\s*insert\b/i.test(sql)) {
      const info = stmt.run(...cleanParams)
      return { data: { lastInsertRowid: Number(info.lastInsertRowid), changes: info.changes } }
    }
    if (/^\s*update\b/i.test(sql)) {
      const info = stmt.run(...cleanParams)
      return { data: { changes: info.changes } }
    }
    if (/^\s*delete\b/i.test(sql)) {
      const info = stmt.run(...cleanParams)
      return { data: { changes: info.changes } }
    }

    // 其他语句
    const info = stmt.run(...cleanParams)
    return { data: { changes: info.changes } }
  } catch (error: any) {
    console.error('[DB] Error:', error.message)
    return { error: error.message }
  }
}

// 兼容旧接口（按表名/操作直接操作）
export function query(table: string, operation: 'select' | 'insert' | 'update' | 'delete', data?: any, condition?: { field: string, value: any }): any {
  if (!db) return { error: '数据库未初始化' }

  try {
    switch (operation) {
      case 'select': {
        const rows = condition
          ? db.prepare(`SELECT * FROM ${table} WHERE ${condition.field} = ?`).all(condition.value)
          : db.prepare(`SELECT * FROM ${table}`).all()
        return rows
      }
      case 'insert': {
        const cols = Object.keys(data || {})
        if (cols.length === 0) return { error: '无数据' }
        const info = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
          .run(...cols.map(c => (data[c] === undefined ? null : data[c])))
        return { ...data, id: data.id || info.lastInsertRowid }
      }
      case 'update': {
        if (!condition) return { error: '缺少条件' }
        const cols = Object.keys(data || {})
        if (cols.length === 0) return { error: '无数据' }
        const info = db.prepare(`UPDATE ${table} SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE ${condition.field} = ?`)
          .run(...cols.map(c => (data[c] === undefined ? null : data[c])), condition.value)
        return { changes: info.changes }
      }
      case 'delete': {
        if (!condition) return { error: '缺少条件' }
        const info = db.prepare(`DELETE FROM ${table} WHERE ${condition.field} = ?`).run(condition.value)
        return { changes: info.changes }
      }
      default:
        return { error: 'Invalid operation' }
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

export function getDatabase(): Database.Database | null {
  return db
}

export function closeDatabase(): void {
  try {
    db?.close()
  } catch {
    // 忽略关闭错误
  }
}
