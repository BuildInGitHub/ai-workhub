import { useState, useEffect, useRef } from 'react'
import { 
  Search, 
  X, 
  File, 
  Link, 
  CheckSquare, 
  Briefcase,
  Clock,
  Command
} from 'lucide-react'
import type { Link as LinkType, Task, Project, FavoriteFile } from '../types'

interface SearchResult {
  type: 'file' | 'link' | 'task' | 'project'
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
}

interface GlobalSearchProps {
  onClose: () => void
}

export default function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        results[selectedIndex].action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, onClose])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const search = async () => {
      setIsLoading(true)
      const newResults: SearchResult[] = []
      const lowerQuery = query.toLowerCase()

      if (!window.electronAPI) {
        setIsLoading(false)
        return
      }

      try {
        // 搜索链接
        const linksResult = await window.electronAPI.db.query(
          "SELECT * FROM links WHERE title LIKE ? OR url LIKE ? OR description LIKE ? LIMIT 3",
          [`%${query}%`, `%${query}%`, `%${query}%`]
        )
        if (linksResult.data) {
          linksResult.data.forEach((link: LinkType) => {
            newResults.push({
              type: 'link',
              title: link.title,
              subtitle: link.url,
              icon: <Link size={18} className="text-green-500" />,
              action: () => {
                window.electronAPI?.shell.openExternal(link.url)
                onClose()
              }
            })
          })
        }

        // 搜索任务
        const tasksResult = await window.electronAPI.db.query(
          "SELECT * FROM tasks WHERE title LIKE ? OR description LIKE ? LIMIT 3",
          [`%${query}%`, `%${query}%`]
        )
        if (tasksResult.data) {
          tasksResult.data.forEach((task: Task) => {
            newResults.push({
              type: 'task',
              title: task.title,
              subtitle: task.description || `优先级: ${task.priority}`,
              icon: <CheckSquare size={18} className="text-purple-500" />,
              action: () => {
                // 跳转到任务管理
                onClose()
              }
            })
          })
        }

        // 搜索项目
        const projectsResult = await window.electronAPI.db.query(
          "SELECT * FROM projects WHERE name LIKE ? OR description LIKE ? LIMIT 3",
          [`%${query}%`, `%${query}%`]
        )
        if (projectsResult.data) {
          projectsResult.data.forEach((project: Project) => {
            newResults.push({
              type: 'project',
              title: project.name,
              subtitle: project.description,
              icon: <Briefcase size={18} className="text-orange-500" />,
              action: () => {
                onClose()
              }
            })
          })
        }

        // 搜索收藏文件
        const filesResult = await window.electronAPI.db.query(
          "SELECT * FROM favorite_files WHERE name LIKE ? LIMIT 3",
          [`%${query}%`]
        )
        if (filesResult.data) {
          filesResult.data.forEach((file: FavoriteFile) => {
            newResults.push({
              type: 'file',
              title: file.name,
              subtitle: file.path,
              icon: <File size={18} className="text-blue-500" />,
              action: () => {
                onClose()
              }
            })
          })
        }

        setResults(newResults)
        setSelectedIndex(0)
      } catch (error) {
        console.error('搜索失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [query, onClose])

  // 滚动到选中项
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const typeLabels = {
    file: '文件',
    link: '链接',
    task: '任务',
    project: '项目'
  }

  return (
    <div className="fixed inset-0 bg-ink-400/50 flex items-start justify-center pt-24 z-50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-elevated overflow-hidden animate-slideIn">
        {/* 搜索输入框 */}
        <div className="flex items-center gap-3 p-4 border-b border-studio-200">
          <Search size={22} className="text-studio-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件、链接、任务、项目..."
            className="flex-1 text-lg outline-none placeholder:text-studio-400"
          />
          <div className="flex items-center gap-1 text-studio-400">
            <Command size={14} />
            <span className="text-sm">K</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-studio-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* 搜索结果 */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-studio-400">
              搜索中...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-studio-400">
              {query ? '没有找到匹配的结果' : '输入关键词开始搜索'}
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${index}`}
                  onClick={result.action}
                  className={`
                    flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    ${index === selectedIndex ? 'bg-caramel-50' : 'hover:bg-studio-50'}
                  `}
                >
                  <div className="w-10 h-10 rounded-xl bg-studio-100 flex items-center justify-center">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink-100 truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-sm text-studio-500 truncate">{result.subtitle}</div>
                    )}
                  </div>
                  <span className="text-xs text-studio-400 bg-studio-100 px-2 py-1 rounded">
                    {typeLabels[result.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-3 bg-studio-50 border-t border-studio-200 flex items-center justify-between text-xs text-studio-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border">↵</kbd>
              打开
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border">esc</kbd>
              关闭
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
