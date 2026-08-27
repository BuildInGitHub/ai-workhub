import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    getStats: (filePath: string) => ipcRenderer.invoke('fs:getStats', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    getDrives: () => ipcRenderer.invoke('fs:getDrives'),
  },
  
  // 对话框
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  
  // 系统
  os: {
    homeDir: () => ipcRenderer.invoke('os:homeDir'),
    desktopDir: () => ipcRenderer.invoke('os:desktopDir'),
    documentsDir: () => ipcRenderer.invoke('os:documentsDir'),
  },
  
  // Shell
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
  
  // 数据库
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  },
})
