import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, runQuery } from './database'

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 禁用 GPU 加速（Windows兼容性问题）
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

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
  // 初始化数据库
  initDatabase()
  
  createWindow()
  createTray()

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
