import { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  File, 
  ChevronRight, 
  Home,
  HardDrive,
  Star,
  StarOff,
  RefreshCw,
  Upload,
  FolderPlus,
  Search,
  Eye
} from 'lucide-react'
import type { FileEntry, FavoriteFile } from '../types'
import { v4 as uuidv4 } from 'uuid'

interface FileManagerProps {
  onFilePreview?: (file: { path: string; name: string }) => void
}

export default function FileManager({ onFilePreview }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [favoriteFiles, setFavoriteFiles] = useState<FavoriteFile[]>([])
  const [drives, setDrives] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    loadDrives()
    loadFavorites()
  }, [])

  const loadDrives = async () => {
    if (!window.electronAPI) return
    try {
      const driveList = await window.electronAPI.fs.getDrives()
      if (Array.isArray(driveList)) {
        setDrives(driveList)
        if (driveList.length > 0) {
          setCurrentPath(driveList[0])
        }
      }
    } catch (error) {
      console.error('加载驱动器失败:', error)
    }
  }

  const loadFavorites = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM favorite_files ORDER BY created_at DESC"
      )
      if (result.data) {
        setFavoriteFiles(result.data)
      }
    } catch (error) {
      console.error('加载收藏失败:', error)
    }
  }

  const loadDirectory = async (path: string) => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const result = await window.electronAPI.fs.readDir(path)
      if (Array.isArray(result)) {
        const sorted = [...result].sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
        setEntries(sorted)
        setCurrentPath(path)
      } else if (result && (result as any).error) {
        console.error('加载目录失败:', (result as any).error)
      }
    } catch (error) {
      console.error('加载目录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDirectoryClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      loadDirectory(entry.path)
    } else {
      setSelectedFile(entry.path)
    }
  }

  const handleGoUp = () => {
    if (!currentPath) return
    const parts = currentPath.split(/[/\\]/)
    if (parts.length <= 1) return
    parts.pop()
    const parentPath = parts.join('\\') || parts[0] + '\\'
    loadDirectory(parentPath)
  }

  const addToFavorites = async (entry: FileEntry) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query(
        "INSERT OR REPLACE INTO favorite_files (id, name, path, type, size, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        [uuidv4(), entry.name, entry.path, entry.isDirectory ? 'folder' : 'file', 0]
      )
      loadFavorites()
    } catch (error) {
      console.error('添加收藏失败:', error)
    }
  }

  const removeFromFavorites = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query(
        "DELETE FROM favorite_files WHERE id = ?",
        [id]
      )
      loadFavorites()
    } catch (error) {
      console.error('移除收藏失败:', error)
    }
  }

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return
    const path = await window.electronAPI.dialog.selectDirectory()
    if (path) {
      loadDirectory(path)
    }
  }

  const getFileIcon = (entry: FileEntry) => {
    if (entry.isDirectory) return <FolderOpen size={20} className="text-amber-500" />
    
    const ext = entry.name.split('.').pop()?.toLowerCase()
    const colorMap: Record<string, string> = {
      pdf: 'text-red-500',
      doc: 'text-blue-500',
      docx: 'text-blue-500',
      xls: 'text-green-500',
      xlsx: 'text-green-500',
      ppt: 'text-orange-500',
      pptx: 'text-orange-500',
      txt: 'text-gray-500',
      js: 'text-yellow-500',
      ts: 'text-blue-500',
      py: 'text-green-500',
      html: 'text-orange-500',
      css: 'text-blue-500',
      json: 'text-yellow-500',
      md: 'text-gray-500',
    }
    return <File size={20} className={colorMap[ext || ''] || 'text-studio-500'} />
  }

  return (
    <div className="h-full flex bg-studio-50">
      {/* 左侧边栏 */}
      <div className="w-64 bg-white border-r border-studio-200 flex flex-col">
        {/* 驱动器列表 */}
        <div className="p-4 border-b border-studio-200">
          <h3 className="text-sm font-semibold text-studio-500 mb-3 flex items-center gap-2">
            <HardDrive size={16} />
            我的电脑
          </h3>
          <div className="space-y-1">
            {drives.map((drive) => (
              <button
                key={drive}
                onClick={() => loadDirectory(drive)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  currentPath.startsWith(drive) 
                    ? 'bg-caramel-100 text-caramel-600' 
                    : 'hover:bg-studio-100 text-ink-100'
                }`}
              >
                <HardDrive size={16} className="inline mr-1.5 text-studio-400" />
                {drive}
              </button>
            ))}
          </div>
        </div>

        {/* 收藏夹 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-studio-500 flex items-center gap-2">
              <Star size={16} className="text-caramel-400" />
              收藏夹
            </h3>
          </div>
          <div className="space-y-1">
            {favoriteFiles.length === 0 ? (
              <p className="text-xs text-studio-400 text-center py-4">暂无收藏</p>
            ) : (
              favoriteFiles.map((fav) => (
                <div
                  key={fav.id}
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-studio-100 cursor-pointer"
                  onClick={() => loadDirectory(fav.path)}
                >
                  <FolderOpen size={16} className="text-amber-500" />
                  <span className="text-sm text-ink-100 truncate flex-1">{fav.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromFavorites(fav.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-studio-400 hover:text-caramel-400"
                  >
                    <StarOff size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 右侧文件区 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 p-4 bg-white border-b border-studio-200">
          <button
            onClick={handleGoUp}
            disabled={!currentPath || drives.includes(currentPath)}
            className="p-2.5 rounded-xl hover:bg-studio-100 disabled:opacity-40 text-studio-500"
            title="返回上级"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-500"
            title="刷新"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleSelectFolder}
            className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-500"
            title="选择文件夹"
          >
            <FolderPlus size={20} />
          </button>
          
          {/* 搜索 */}
          <div className="flex-1 relative ml-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文件..."
              className="w-full pl-10 pr-4 py-2.5 bg-studio-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-caramel-200"
            />
          </div>
          
          {/* 当前路径 */}
          <div className="px-4 py-2.5 bg-studio-100 rounded-xl text-sm text-ink-100 max-w-xs truncate">
            {currentPath || '请选择驱动器'}
          </div>
        </div>

        {/* 文件列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw size={32} className="animate-spin text-caramel-400" />
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {entries
                .filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((entry) => (
                <div
                  key={entry.path}
                  className={`group flex flex-col items-center p-4 rounded-2xl cursor-pointer transition-all hover:shadow-soft ${
                    selectedFile === entry.path 
                      ? 'bg-caramel-50 ring-2 ring-caramel-300' 
                      : 'bg-white hover:bg-studio-50'
                  }`}
                  onClick={() => handleDirectoryClick(entry)}
                  onDoubleClick={() => entry.isDirectory && loadDirectory(entry.path)}
                >
                  <div className="relative">
                    {getFileIcon(entry)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToFavorites(entry)
                      }}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 bg-white rounded-full shadow-soft"
                      title="添加到收藏"
                    >
                      <Star size={12} className="text-caramel-400" />
                    </button>
                  </div>
                  <span className="text-sm mt-3 text-center truncate w-full" title={entry.name}>
                    {entry.name}
                  </span>
                  {!entry.isDirectory && onFilePreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onFilePreview({ path: entry.path, name: entry.name })
                      }}
                      className="mt-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-studio-100 hover:bg-caramel-100 text-studio-500 hover:text-caramel-600"
                      title="预览"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {entries.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-studio-400">
              <FolderOpen size={56} className="mb-4 text-studio-300" />
              <p>选择驱动器开始浏览</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
