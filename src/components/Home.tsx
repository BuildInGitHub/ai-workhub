import { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  Link, 
  CheckSquare, 
  Briefcase, 
  Zap,
  Star,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Calendar,
  Hand
} from 'lucide-react'
import type { Tab, Link as LinkType, Task } from '../types'

interface HomeProps {
  onAddTab: (type: Tab['type'], title: string) => void
  refreshKey?: number
}

export default function Home({ onAddTab, refreshKey }: HomeProps) {
  const [recentLinks, setRecentLinks] = useState<LinkType[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalTasks: 0,
    completedTasks: 0,
    favoriteFiles: 0
  })

  useEffect(() => {
    loadData()
    
    // 监听标签页显示状态，数据变化时刷新
    const handleVisibility = () => {
      if (!document.hidden) {
        loadData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refreshKey])

  const loadData = async () => {
    if (!window.electronAPI) return

    try {
      const linksResult = await window.electronAPI.db.query(
        "SELECT * FROM links ORDER BY created_at DESC LIMIT 5"
      )
      if (linksResult.data) {
        setRecentLinks(linksResult.data)
      }

      const tasksResult = await window.electronAPI.db.query(
        "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5"
      )
      if (tasksResult.data) {
        setRecentTasks(tasksResult.data.map((t: any) => ({
          ...t,
          completed: Boolean(t.completed)
        })))
      }

      const linkCount = await window.electronAPI.db.query("SELECT COUNT(*) as count FROM links")
      const taskCount = await window.electronAPI.db.query("SELECT COUNT(*) as count FROM tasks")
      const completedCount = await window.electronAPI.db.query(
        "SELECT COUNT(*) as count FROM tasks WHERE completed = 1"
      )
      const favCount = await window.electronAPI.db.query(
        "SELECT COUNT(*) as count FROM favorite_files"
      )

      setStats({
        totalLinks: linkCount.data?.[0]?.count || 0,
        totalTasks: taskCount.data?.[0]?.count || 0,
        completedTasks: completedCount.data?.[0]?.count || 0,
        favoriteFiles: favCount.data?.[0]?.count || 0
      })
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const quickActions = [
    { icon: <FolderOpen size={28} />, label: '浏览文件', type: 'files' as Tab['type'], color: 'from-blue-400 to-blue-500' },
    { icon: <Link size={28} />, label: '添加链接', type: 'links' as Tab['type'], color: 'from-green-400 to-green-500' },
    { icon: <CheckSquare size={28} />, label: '新建任务', type: 'tasks' as Tab['type'], color: 'from-purple-400 to-purple-500' },
    { icon: <Briefcase size={28} />, label: '创建项目', type: 'projects' as Tab['type'], color: 'from-orange-400 to-orange-500' },
  ]

  const tips = [
    "试试告诉AI助手「帮我整理桌面」",
    "可以将常用链接添加到快速访问",
    "用项目来组织相关的工作内容"
  ]

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* 欢迎区域 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-100 mb-2 flex items-center gap-3">
            欢迎回来 <Hand size={32} className="text-caramel-400" />
          </h1>
          <p className="text-studio-500">今天的工作从这里开始</p>
        </div>
        {/* AI 智能建议 */}
        <div className="bg-gradient-to-r from-caramel-50 to-caramel-100 rounded-2xl p-4 max-w-xs border border-caramel-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-caramel-400" />
            <span className="text-sm font-medium text-caramel-600">智能建议</span>
          </div>
          <p className="text-sm text-ink-100">{tips[Math.floor(Math.random() * tips.length)]}</p>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-ink-100 mb-4">快速操作</h2>
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.type}
              onClick={() => onAddTab(action.type, action.label.replace('添加', '').replace('新建', '').replace('创建', '').replace('浏览', ''))}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl hover:shadow-medium transition-all group card-hover border border-studio-200"
            >
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform shadow-soft`}>
                {action.icon}
              </div>
              <span className="font-medium text-ink-100">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <Link size={22} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.totalLinks}</p>
              <p className="text-sm text-studio-500">收藏链接</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50">
              <CheckSquare size={22} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.totalTasks}</p>
              <p className="text-sm text-studio-500">总任务</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50">
              <TrendingUp size={22} className="text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.completedTasks}</p>
              <p className="text-sm text-studio-500">已完成</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-50">
              <Star size={22} className="text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.favoriteFiles}</p>
              <p className="text-sm text-studio-500">收藏文件</p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近项目和任务 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 最近链接 */}
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-ink-100 flex items-center gap-2">
              <Clock size={18} className="text-caramel-400" />
              最近链接
            </h3>
            <button 
              onClick={() => onAddTab('links', '链接收藏')}
              className="text-sm text-caramel-400 hover:text-caramel-500 flex items-center gap-1"
            >
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {recentLinks.length === 0 ? (
              <p className="text-studio-500 text-sm text-center py-6">暂无链接</p>
            ) : (
              recentLinks.map((link) => (
                <a
                  key={link.id}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    const url = link.url.match(/^https?:\/\//i) ? link.url : 'https://' + link.url
                    window.electronAPI?.shell.openExternal(url)
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-studio-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-studio-100 flex items-center justify-center">
                    <Link size={14} className="text-studio-500" />
                  </div>
                  <span className="text-sm text-ink-100 truncate">{link.title}</span>
                </a>
              ))
            )}
          </div>
        </div>

        {/* 最近任务 */}
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-ink-100 flex items-center gap-2">
              <Calendar size={18} className="text-caramel-400" />
              最近任务
            </h3>
            <button 
              onClick={() => onAddTab('tasks', '任务管理')}
              className="text-sm text-caramel-400 hover:text-caramel-500 flex items-center gap-1"
            >
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {recentTasks.length === 0 ? (
              <p className="text-studio-500 text-sm text-center py-6">暂无任务</p>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    task.completed ? 'opacity-60' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={async () => {
                      if (window.electronAPI) {
                        await window.electronAPI.db.query(
                          "UPDATE tasks SET completed = ?, updated_at = datetime('now') WHERE id = ?",
                          [task.completed ? 0 : 1, task.id]
                        )
                        loadData()
                      }
                    }}
                    className="w-5 h-5 rounded-lg border-2 border-studio-300 text-caramel-400 focus:ring-caramel-200"
                  />
                  <span className={`text-sm ${task.completed ? 'line-through text-studio-500' : 'text-ink-100'}`}>
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
