import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { initDatabase, runQuery, closeDatabase } from './database'

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 禁用 GPU 加速（Windows兼容性问题）
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// ===========================
// 数据备份管理
// ===========================
const BACKUP_KEEP_COUNT = 10

function getDbPaths() {
  const userDataPath = app.getPath('userData')
  return {
    dbPath: path.join(userDataPath, 'ai-workhub.db'),
    backupDir: path.join(userDataPath, 'backups')
  }
}

// 备份当前数据库到 backups 目录（保留最近 N 份）
async function backupDatabase(): Promise<string | null> {
  try {
    const { dbPath, backupDir } = getDbPaths()
    if (!fs.existsSync(dbPath)) return null
    fs.mkdirSync(backupDir, { recursive: true })

    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`
    const backupPath = path.join(backupDir, `ai-workhub-data-${stamp}.db`)
    await fs.promises.copyFile(dbPath, backupPath)

    // 清理旧备份，保留最近 N 份（兼容旧的 .json 备份）
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('ai-workhub-data-'))
      .sort()
    while (files.length > BACKUP_KEEP_COUNT) {
      const oldest = files.shift()!
      try { fs.unlinkSync(path.join(backupDir, oldest)) } catch { /* 忽略 */ }
    }
    return backupPath
  } catch (error: any) {
    console.error('[Main] 备份失败:', error.message)
    return null
  }
}

// 手动备份
ipcMain.handle('db:backupNow', async () => {
  const backupPath = await backupDatabase()
  return backupPath
    ? { success: true, message: `备份完成: ${path.basename(backupPath)}`, path: backupPath }
    : { success: false, message: '备份失败' }
})

// 导出数据库
ipcMain.handle('db:exportData', async () => {
  try {
    const { dbPath } = getDbPaths()
    if (!fs.existsSync(dbPath)) return { success: false, message: '数据库文件不存在' }
    const defaultName = `ai-workhub-export-${new Date().toISOString().slice(0,10)}.db`
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出数据',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'SQLite 数据库文件', extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) return { success: false, message: '已取消导出' }
    await fs.promises.copyFile(dbPath, result.filePath)
    return { success: true, message: `已导出到 ${result.filePath}` }
  } catch (error: any) {
    return { success: false, message: `导出失败: ${error.message}` }
  }
})

// 导入数据库（先备份现有数据再覆盖）
ipcMain.handle('db:importData', async () => {
  try {
    const { dbPath } = getDbPaths()
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入数据（将覆盖当前数据）',
      properties: ['openFile'],
      filters: [
        { name: '数据库备份文件', extensions: ['db', 'json'] }
      ]
    })
    if (result.canceled || !result.filePaths[0]) return { success: false, message: '已取消导入' }

    const importPath = result.filePaths[0]
    // 简单校验：JSON 需可解析；db 文件需存在
    if (importPath.toLowerCase().endsWith('.json')) {
      const content = fs.readFileSync(importPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: '文件不是有效的数据库备份' }
      }
    }

    // 导入前自动备份现有数据
    await backupDatabase()
    // 关闭数据库连接后覆盖文件，再重新打开
    closeDatabase()
    await fs.promises.copyFile(importPath, dbPath)
    initDatabase()
    return { success: true, message: '导入成功，数据已重新加载' }
  } catch (error: any) {
    return { success: false, message: `导入失败: ${error.message}` }
  }
})

// 获取备份信息
ipcMain.handle('db:getBackupInfo', async () => {
  try {
    const { dbPath, backupDir } = getDbPaths()
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
    let backups: Array<{ name: string; size: number; time: string }> = []
    if (fs.existsSync(backupDir)) {
      backups = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const s = fs.statSync(path.join(backupDir, f))
          return { name: f, size: s.size, time: s.mtime.toISOString() }
        })
        .sort((a, b) => b.time.localeCompare(a.time))
    }
    return {
      dbPath,
      backupDir,
      dbSize,
      backups
    }
  } catch (error: any) {
    return { error: error.message }
  }
})

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !!VITE_DEV_SERVER_URL

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    frame: true,
    show: false,
    backgroundColor: '#1e1e2e',
  })

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 加载页面
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // 窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  // 创建一个简单的托盘图标
  const iconPath = isDev 
    ? path.join(__dirname, '../public/tray-icon.png')
    : path.join(__dirname, '../dist/tray-icon.png')
  
  // 如果图标不存在，创建一个空白图标
  let trayIcon: nativeImage
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty()
    }
  } catch {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADDSURBVDiNpdMxDoJAEAXQtz0QG8HCxlJPYWWhsU0MjsAR7Cws9RR6Cm5hYqWlsNLQwEAkorJYNkv+m5n5fwYEQBiGqOoGqOqGiPYPxHF8A2A3q7u7Z1V9AdhExEVE9kRUz3pEhKrapKo7AN2sR8Cdqi6J6I6Ijt2dqnYAOlWdAOhkPQN2qrokorOsZ8BOR+8RcKWqM9fL1gGc9fQuAldEtO9l3QMWPR2SiC58n0RE3M96AKyBh75nqroHoKrTO8C8p0cSsO7rU9V3gKNPnwB7PV0C3gGO0x4Bd306S4ATYOYHfAD+ACaLqxgXy1I4AAAAAElFTkSuQmCC') : trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show()
      }
    },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('AI WorkHub - 智汇工作台')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
  })
}

// 扩展 isQuitting 属性
declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}

// ===========================
// 全局错误防护（防止系统错误弹窗）
// ===========================

// 1. 处理 stdout/stderr 的 EPIPE 错误（start.bat 启动时控制台关闭导致管道破裂）
if (process.stdout) {
  process.stdout.on('error', (err: any) => {
    if (err.code === 'EPIPE') return
    throw err
  })
}
if (process.stderr) {
  process.stderr.on('error', (err: any) => {
    if (err.code === 'EPIPE') return
    throw err
  })
}

// 2. 捕获未处理异常，阻止 Electron 默认错误弹窗
process.on('uncaughtException', (error) => {
  try {
    console.error('[Main] Uncaught exception:', error.message || error)
  } catch {
    // 连 console 都失败时静默忽略（如 EPIPE）
  }
  // EPIPE / 管道类错误直接忽略，不影响应用运行
  const code = (error as any)?.code
  if (code === 'EPIPE' || code === 'ERR_STREAM_DESTROYED' || code === 'ERR_STREAM_WRITE_AFTER_END') {
    return
  }
  // 其他严重错误只记录日志，仍然不弹窗，避免影响用户
})

// 3. 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason) => {
  try {
    console.error('[Main] Unhandled rejection:', reason)
  } catch {
    // 忽略
  }
})

app.whenReady().then(async () => {
  // 启动前自动备份上一份数据（保留最近10份）
  await backupDatabase()
  
  // 初始化数据库
  initDatabase()
  
  createWindow()
  createTray()

  // 壁纸自检：若壁纸文件被意外移走（如整理桌面导致黑屏），自动找回恢复
  try {
    const wallpaperPath = await readWallpaperFromRegistry()
    if (wallpaperPath && wallpaperPath.toLowerCase().includes('desktop')) {
      const fs = await import('fs/promises')
      try {
        await fs.access(wallpaperPath)
      } catch {
        // 壁纸文件丢失，从桌面分类文件夹找回
        const pathModule = await import('path')
        const dir = pathModule.dirname(wallpaperPath)
        const fileName = pathModule.basename(wallpaperPath)
        for (const folder of ['图片', '其他', '视频', '文档']) {
          const candidate = pathModule.join(dir, folder, fileName)
          try {
            await fs.access(candidate)
            await fs.rename(candidate, wallpaperPath)
            await applyWallpaper(wallpaperPath)
            console.log('[Main] 壁纸已自动恢复:', wallpaperPath)
            break
          } catch {
            // 继续查找下一个文件夹
          }
        }
      }
    }
  } catch {
    // 忽略壁纸自检失败
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch((error) => {
  // 初始化失败时不弹系统错误窗，仅记录日志
  try {
    console.error('[Main] Startup error:', error)
  } catch {
    // 忽略
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  // 退出前备份（确保最新数据有存档）
  backupDatabase()
})

// IPC 处理器

// 获取目录内容
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  const fs = await import('fs/promises')
  const pathModule = await import('path')
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map(entry => ({
      name: entry.name,
      path: pathModule.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile()
    }))
  } catch (error: any) {
    return { error: error.message }
  }
})

// 获取文件信息
ipcMain.handle('fs:getStats', async (_, filePath: string) => {
  const fs = await import('fs/promises')
  const pathModule = await import('path')
  try {
    const stats = await fs.stat(filePath)
    return {
      name: pathModule.basename(filePath),
      path: filePath,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString()
    }
  } catch (error: any) {
    return { error: error.message }
  }
})

// 移动/重命名文件
ipcMain.handle('fs:moveFile', async (_, srcPath: string, destPath: string) => {
  const fs = await import('fs/promises')
  const pathModule = await import('path')
  try {
    // 确保目标目录存在
    const destDir = pathModule.dirname(destPath)
    await fs.mkdir(destDir, { recursive: true })
    // 移动文件
    await fs.rename(srcPath, destPath)
    return { success: true, from: srcPath, to: destPath }
  } catch (error: any) {
    return { error: error.message }
  }
})

// 读取文件内容
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  const fs = await import('fs/promises')
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { content }
  } catch (error: any) {
    return { error: error.message }
  }
})

// 打开系统对话框选择目录
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// 打开系统对话框选择文件
ipcMain.handle('dialog:selectFile', async (_, options?: { filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

// 打开系统对话框选择应用(.exe)
ipcMain.handle('dialog:selectApp', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: '应用程序', extensions: ['exe', 'bat', 'cmd'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

// 使用默认应用打开文件或文件夹
ipcMain.handle('shell:openPath', async (_, path: string) => {
  try {
    await shell.openPath(path)
  } catch (error: any) {
    console.error('[Main] openPath error:', error.message)
  }
})

// 打开外部链接
ipcMain.handle('shell:openExternal', async (_, url: string) => {
  try {
    await shell.openExternal(url)
  } catch (error: any) {
    console.error('[Main] openExternal error:', error.message)
    // 忽略 EPIPE 等错误，不弹窗
  }
})

// 获取用户主目录
ipcMain.handle('os:homeDir', () => {
  return app.getPath('home')
})

// ===========================
// 壁纸保护与恢复
// ===========================

// 读取注册表中的壁纸路径 (Windows: HKCU\Control Panel\Desktop\WallPaper)
function readWallpaperFromRegistry(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const { exec } = require('child_process')
      exec('reg query "HKCU\\Control Panel\\Desktop" /v WallPaper', { timeout: 5000 }, (err: any, stdout: string) => {
        if (err) {
          resolve(null)
          return
        }
        const m = stdout.match(/WallPaper\s+REG_SZ\s+(.+)/)
        resolve(m ? m[1].trim() : null)
      })
    } catch {
      resolve(null)
    }
  })
}

// 通过 SystemParametersInfo 重新应用壁纸
function applyWallpaper(imagePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const { exec } = require('child_process')
      const cmd = `powershell -NoProfile -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class W{[DllImport(\\\\"user32.dll\\\\",SetLastError=true)]public static extern bool SystemParametersInfo(int uAction,int uParam,string lpvParam,int fuWinIni);}'; [W]::SystemParametersInfo(20,0,'${imagePath.replace(/'/g, "''")}',3)"`
      exec(cmd, { timeout: 8000 }, (err: any) => {
        resolve(!err)
      })
    } catch {
      resolve(false)
    }
  })
}

// 获取当前壁纸路径
ipcMain.handle('system:getWallpaper', async () => {
  return await readWallpaperFromRegistry()
})

// 恢复壁纸：若壁纸文件被移走，从桌面分类文件夹找回并重新应用
ipcMain.handle('system:restoreWallpaper', async () => {
  try {
    const wallpaperPath = await readWallpaperFromRegistry()
    if (!wallpaperPath) {
      return { success: false, message: '无法读取壁纸设置' }
    }

    const fs = await import('fs/promises')
    const pathModule = await import('path')

    // 情况1: 壁纸文件还在，直接重新应用
    try {
      await fs.access(wallpaperPath)
      const ok = await applyWallpaper(wallpaperPath)
      return { success: ok, message: ok ? '壁纸已重新应用' : '壁纸文件存在，但应用失败', path: wallpaperPath }
    } catch {
      // 文件不存在，继续查找
    }

    // 情况2: 文件被移走了，在桌面分类文件夹中按文件名找回
    const dir = pathModule.dirname(wallpaperPath)
    const fileName = pathModule.basename(wallpaperPath)
    const searchFolders = ['图片', '其他', '视频', '文档']
    for (const folder of searchFolders) {
      const candidate = pathModule.join(dir, folder, fileName)
      try {
        await fs.access(candidate)
        // 找到了，移回原位
        await fs.rename(candidate, wallpaperPath)
        const ok = await applyWallpaper(wallpaperPath)
        return {
          success: ok,
          message: ok
            ? `已从「${folder}」文件夹找回壁纸文件并恢复`
            : `壁纸文件已移回原位（${wallpaperPath}），请在桌面右键「个性化」重新设置`,
          path: wallpaperPath
        }
      } catch {
        // 该文件夹没有，继续
      }
    }

    return {
      success: false,
      message: `壁纸文件「${fileName}」未找到，请在桌面右键「个性化」手动设置壁纸`
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
})

// 获取桌面路径
ipcMain.handle('os:desktopDir', () => {
  return app.getPath('desktop')
})

// 获取文档路径
ipcMain.handle('os:documentsDir', () => {
  return app.getPath('documents')
})

// 数据库操作
ipcMain.handle('db:query', async (_, sql: string, params?: any[]) => {
  console.log('[Main] db:query received', sql.substring(0, 60), params)
  try {
    const result = runQuery(sql, params)
    console.log('[Main] db:query result:', result)
    return result
  } catch (error: any) {
    console.error('[Main] db:query error:', error)
    return { error: error.message }
  }
})

// 获取所有磁盘驱动器
ipcMain.handle('fs:getDrives', async () => {
  const fs = await import('fs/promises')
  try {
    // Windows 驱动器
    if (process.platform === 'win32') {
      const drives: string[] = []
      for (let i = 65; i <= 90; i++) {
        const drive = String.fromCharCode(i) + ':\\'
        try {
          await fs.access(drive)
          drives.push(drive)
        } catch {
          // 驱动器不存在
        }
      }
      return drives
    }
    return ['/']
  } catch (error: any) {
    return { error: error.message }
  }
})
