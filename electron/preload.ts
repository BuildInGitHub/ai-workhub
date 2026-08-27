import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统
  fs: {
    readDir: (dirPath: string) => {
      console.log('[Preload] fs:readDir', dirPath)
      return ipcRenderer.invoke('fs:readDir', dirPath)
    },
    getStats: (filePath: string) => ipcRenderer.invoke('fs:getStats', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    getDrives: () => ipcRenderer.invoke('fs:getDrives'),
    moveFile: (srcPath: string, destPath: string) => ipcRenderer.invoke('fs:moveFile', srcPath, destPath),
  },
  
  // 对话框
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    selectFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => 
      ipcRenderer.invoke('dialog:selectFile', options),
    selectApp: () => ipcRenderer.invoke('dialog:selectApp'),
  },
  
  // 系统
  os: {
    homeDir: () => ipcRenderer.invoke('os:homeDir'),
    desktopDir: () => ipcRenderer.invoke('os:desktopDir'),
    documentsDir: () => ipcRenderer.invoke('os:documentsDir'),
  },

  // 壁纸保护
  wallpaper: {
    get: () => ipcRenderer.invoke('system:getWallpaper'),
    restore: () => ipcRenderer.invoke('system:restoreWallpaper'),
  },
  
  // Shell
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  },
  
  // 数据库
  db: {
    query: (sql: string, params?: any[]) => {
      console.log('[Preload] db:query called', sql.substring(0, 50), params)
      return ipcRenderer.invoke('db:query', sql, params)
    },
  },
})
