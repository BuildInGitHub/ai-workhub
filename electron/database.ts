import path from 'path'
import { app } from 'electron'
import fs from 'fs'

// 简单的JSON文件存储
interface Database {
  links: any[]
  favorite_files: any[]
  tasks: any[]
  chat_history: any[]
  projects: any[]
  project_items: any[]
  settings: any[]
  quick_launch: any[]
  calendar_events: any[]
  quick_notes: any[]
}

let db: Database = {
  links: [],
  favorite_files: [],
  tasks: [],
  chat_history: [],
  projects: [],
  project_items: [],
  settings: [],
  quick_launch: [],
  calendar_events: [],
  quick_notes: []
}

let dbPath: string = ''

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'ai-workhub-data.json')
  
  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  
  // 加载现有数据
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8')
      const loadedDb = JSON.parse(data)
      // 合并现有数据，确保所有表都存在
      db = {
        links: loadedDb.links || [],
        favorite_files: loadedDb.favorite_files || [],
        tasks: loadedDb.tasks || [],
        chat_history: loadedDb.chat_history || [],
        projects: loadedDb.projects || [],
        project_items: loadedDb.project_items || [],
        settings: loadedDb.settings || [],
        quick_launch: loadedDb.quick_launch || [],
        calendar_events: loadedDb.calendar_events || [],
        quick_notes: loadedDb.quick_notes || []
      }
    } catch (error) {
      console.error('[Database] Failed to load database, creating new one:', error)
      saveDatabase()
    }
  } else {
    saveDatabase()
  }
  
  console.log('[Database] JSON storage initialized at:', dbPath)
  console.log('[Database] Tables:', Object.keys(db))
}

function saveDatabase(): void {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
  } catch (error) {
    console.error('[Database] Failed to save database:', error)
  }
}

export function query(table: string, operation: 'select' | 'insert' | 'update' | 'delete', data?: any, condition?: { field: string, value: any }): any {
  const tableName = table as keyof Database
  
  if (!db[tableName]) {
    return { error: `Table ${table} does not exist` }
  }

  switch (operation) {
    case 'select':
      if (condition) {
        return db[tableName].filter((item: any) => item[condition.field] === condition.value)
      }
      return db[tableName]
    
    case 'insert':
      const newItem = { ...data, id: data.id || require('uuid').v4() }
      if (data.created_at === undefined) {
        newItem.created_at = new Date().toISOString()
      }
      db[tableName].push(newItem)
      saveDatabase()
      return newItem
    
    case 'update':
      const index = db[tableName].findIndex((item: any) => item[condition!.field] === condition!.value)
      if (index !== -1) {
        db[tableName][index] = { ...db[tableName][index], ...data }
        saveDatabase()
        return db[tableName][index]
      }
      return { error: 'Item not found' }
    
    case 'delete':
      const deleteIndex = db[tableName].findIndex((item: any) => item[condition!.field] === condition!.value)
      if (deleteIndex !== -1) {
        const deleted = db[tableName].splice(deleteIndex, 1)[0]
        saveDatabase()
        return deleted
      }
      return { error: 'Item not found' }
    
    default:
      return { error: 'Invalid operation' }
  }
}

export function runQuery(sql: string, params?: any[]): any {
  // 简单的SQL解析（仅支持基本操作）
  const sqlLower = sql.toLowerCase().trim()
  
  try {
    // SELECT
    if (sqlLower.startsWith('select')) {
      const tableMatch = sqlLower.match(/from\s+(\w+)/)
      if (tableMatch) {
        const table = tableMatch[1]
        let results = db[table as keyof Database] || []
        
        // WHERE clause - 支持简单条件
        const whereMatch = sqlLower.match(/where\s+(.+?)(?:\s+order|\s+limit|$)/)
        if (whereMatch && params && params.length > 0) {
          const whereClause = whereMatch[1]
          // 处理 AND 条件
          const conditions = whereClause.split(/\s+and\s+/i)
          let paramIndex = 0
          
          results = results.filter((item: any) => {
            let match = true
            for (const cond of conditions) {
              if (paramIndex >= params.length) break
              if (cond.includes('like')) {
                // LIKE 查询
                const fieldMatch = cond.match(/(\w+)\s+like/)
                if (fieldMatch) {
                  const field = fieldMatch[1]
                  let pattern = params[paramIndex]?.toString() || ''
                  // 处理LIKE通配符
                  const isStartsWith = pattern.startsWith('%')
                  const isEndsWith = pattern.endsWith('%')
                  pattern = pattern.replace(/%/g, '')
                  const itemValue = item[field]?.toString().toLowerCase() || ''
                  const searchValue = pattern.toLowerCase()
                  if (isStartsWith && isEndsWith) {
                    match = itemValue.includes(searchValue)
                  } else if (isStartsWith) {
                    match = itemValue.endsWith(searchValue)
                  } else if (isEndsWith) {
                    match = itemValue.startsWith(searchValue)
                  } else {
                    match = itemValue.includes(searchValue)
                  }
                  paramIndex++
                }
              } else if (cond.includes('=')) {
                // 等于查询
                const fieldMatch = cond.match(/(\w+)\s*=\s*\?/)
                if (fieldMatch) {
                  const field = fieldMatch[1]
                  match = item[field] === params[paramIndex]
                  paramIndex++
                }
              }
            }
            return match
          })
        }
        
        // ORDER BY
        const orderMatch = sqlLower.match(/order\s+by\s+(\w+)\s+(asc|desc)?/)
        if (orderMatch) {
          const orderField = orderMatch[1]
          const orderDir = orderMatch[2] || 'asc'
          results.sort((a: any, b: any) => {
            if (orderDir === 'asc') {
              return a[orderField] > b[orderField] ? 1 : -1
            }
            return a[orderField] < b[orderField] ? 1 : -1
          })
        }
        
        // LIMIT
        const limitMatch = sqlLower.match(/limit\s+(\d+)/)
        if (limitMatch) {
          results = results.slice(0, parseInt(limitMatch[1]))
        }
        
        return { data: results }
      }
      return { data: [] }
    }
    
    // INSERT
    if (sqlLower.startsWith('insert')) {
      const tableMatch = sqlLower.match(/into\s+(\w+)/)
      if (tableMatch && params) {
        const table = tableMatch[1]
        
        // 提取字段名
        const fieldsMatch = sqlLower.match(/\(([^)]+)\)\s*values\s*\((.+)\)/)
        if (fieldsMatch) {
          const fields = fieldsMatch[1].split(',').map(f => f.trim())
          const valuesPart = fieldsMatch[2]
          
          // 解析值，判断是 ? 占位符还是字面量
          const valueParts = valuesPart.split(',').map((v: string) => v.trim())
          const obj: any = {}
          let paramIndex = 0
          
          fields.forEach((field: string, i: number) => {
            let value: any
            const vp = valueParts[i]
            
            if (vp === '?') {
              // 是占位符，从params获取
              value = params[paramIndex]
              paramIndex++
            } else if (vp.includes('datetime') && vp.includes('now')) {
              // datetime('now')
              value = new Date().toISOString()
            } else if (!isNaN(Number(vp))) {
              // 数字字面量
              value = Number(vp)
            } else {
              // 字符串字面量
              value = vp.replace(/'/g, '')
            }
            
            obj[field] = value
          })
          
          return query(table, 'insert', obj)
        }
      }
    }
    
    // UPDATE
    if (sqlLower.startsWith('update')) {
      const tableMatch = sqlLower.match(/update\s+(\w+)/)
      const whereMatch = sqlLower.match(/where\s+(\w+)\s*=\s*\?/)
      if (tableMatch && whereMatch && params) {
        const table = tableMatch[1]
        const whereField = whereMatch[1]
        const whereValue = params[params.length - 1]
        
        // 解析SET部分 - 支持 ? 和字面量
        const setMatch = sqlLower.match(/set\s+(.+?)\s+where/)
        if (setMatch) {
          const setParts = setMatch[1].split(',').map((s: string) => s.trim())
          const updateData: any = {}
          let paramIndex = 0
          
          setParts.forEach((sf: string) => {
            const parts = sf.split('=').map((s: string) => s.trim())
            const fieldName = parts[0]
            const valuePart = parts[1]
            
            if (valuePart === '?') {
              updateData[fieldName] = params[paramIndex]
              paramIndex++
            } else if (valuePart.includes('datetime') && valuePart.includes('now')) {
              updateData[fieldName] = new Date().toISOString()
            } else if (!isNaN(Number(valuePart))) {
              updateData[fieldName] = Number(valuePart)
            } else {
              updateData[fieldName] = valuePart.replace(/'/g, '')
            }
          })
          return query(table, 'update', updateData, { field: whereField, value: whereValue })
        }
      }
    }
    
    // DELETE
    if (sqlLower.startsWith('delete')) {
      const tableMatch = sqlLower.match(/from\s+(\w+)/)
      const whereMatch = sqlLower.match(/where\s+(\w+)\s*=\s*\?/)
      if (tableMatch && whereMatch && params) {
        const table = tableMatch[1]
        const whereField = whereMatch[1]
        const whereValue = params[0]
        return query(table, 'delete', null, { field: whereField, value: whereValue })
      }
    }
    
    return { error: 'Unsupported SQL operation' }
  } catch (error: any) {
    return { error: error.message }
  }
}

export function getDatabase(): Database {
  return db
}

export function closeDatabase() {
  saveDatabase()
}
