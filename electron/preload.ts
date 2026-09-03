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
    backupNow: () => ipcRenderer.invoke('db:backupNow'),
    exportData: () => ipcRenderer.invoke('db:exportData'),
    importData: () => ipcRenderer.invoke('db:importData'),
    getBackupInfo: () => ipcRenderer.invoke('db:getBackupInfo'),
  },

  // v2 引擎扩展：MCP / Skills / CLI / Marketplace
  market: {
    fetch: () => ipcRenderer.invoke('market:fetch'),
  },
  mcp: {
    listServers: () => ipcRenderer.invoke('mcp:listServers'),
    start: (id: string) => ipcRenderer.invoke('mcp:start', id),
    stop: (id: string) => ipcRenderer.invoke('mcp:stop', id),
    install: (item: any) => ipcRenderer.invoke('mcp:install', item),
    uninstall: (id: string) => ipcRenderer.invoke('mcp:uninstall', id),
    listTools: () => ipcRenderer.invoke('mcp:listTools'),
    callTool: (serverId: string, toolName: string, args: any) => ipcRenderer.invoke('mcp:callTool', serverId, toolName, args),
  },
  skill: {
    list: () => ipcRenderer.invoke('skill:list'),
    skillsRoot: () => ipcRenderer.invoke('skill:skillsRoot'),
    installFromMarket: (item: any) => ipcRenderer.invoke('skill:installFromMarket', item),
    remove: (name: string) => ipcRenderer.invoke('skill:remove', name),
    readContent: (name: string) => ipcRenderer.invoke('skill:readContent', name),
  },
  cli: {
    list: () => ipcRenderer.invoke('cli:list'),
    detect: (bin: string) => ipcRenderer.invoke('cli:detect', bin),
    install: (item: any) => ipcRenderer.invoke('cli:install', item),
    uninstall: (row: any) => ipcRenderer.invoke('cli:uninstall', row),
    remove: (id: string) => ipcRenderer.invoke('cli:remove', id),
    exec: (bin: string, args: string[]) => ipcRenderer.invoke('cli:exec', bin, args),
    resetErrors: () => ipcRenderer.invoke('mcp:resetErrors'),
    reconnectAll: () => ipcRenderer.invoke('mcp:reconnectAll'),
  },
  // AI 执行中止（强制杀掉所有正在跑的 CLI / MCP 子进程）
  ai: {
    abort: () => ipcRenderer.invoke('ai:abort'),
  },
})
