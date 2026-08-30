import { useState, useEffect } from 'react'
import { 
  Search, 
  Bell, 
  Settings, 
  Wifi, 
  WifiOff,
  Battery,
  Volume2,
  Minus,
  Square,
  X,
  Maximize2,
  Folder,
  CheckSquare,
  Calendar,
  MessageSquarePlus
} from 'lucide-react'

interface TaskBarProps {
  activeTabCount: number
  onSearchClick: () => void
  onSettingsClick: () => void
  onFeedbackClick: () => void
}

export default function TaskBar({ activeTabCount, onSearchClick, onSettingsClick, onFeedbackClick }: TaskBarProps) {
  const [time, setTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-10 bg-white border-t border-studio-200 flex items-center justify-between px-3">
      {/* 左侧：开始菜单/应用按钮 */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-studio-100 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-caramel-400 to-caramel-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <span className="text-sm font-medium text-ink-100">AI WorkHub</span>
        </button>
        
        {/* 快速启动区 */}
        <div className="flex items-center gap-1 ml-4">
          <button className="p-1.5 rounded hover:bg-studio-100" title="文件管理">
            <Folder size={16} className="text-studio-500" />
          </button>
          <button className="p-1.5 rounded hover:bg-studio-100" title="任务">
            <CheckSquare size={16} className="text-studio-500" />
          </button>
          <button className="p-1.5 rounded hover:bg-studio-100" title="日历">
            <Calendar size={16} className="text-studio-500" />
          </button>
        </div>
      </div>

      {/* 中间：活动标签预览 */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-1 px-2 py-1 bg-studio-50 rounded-lg">
          <span className="text-xs text-studio-500">{activeTabCount} 个标签</span>
        </div>
      </div>

      {/* 右侧：系统托盘 */}
      <div className="flex items-center gap-1">
        {/* 搜索 */}
        <button 
          onClick={onSearchClick}
          className="p-1.5 rounded hover:bg-studio-100"
          title="全局搜索"
        >
          <Search size={16} className="text-studio-500" />
        </button>
        
        {/* 通知 */}
        <button className="p-1.5 rounded hover:bg-studio-100 relative" title="通知">
          <Bell size={16} className="text-studio-500" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-caramel-400 rounded-full"></span>
        </button>

        {/* 意见反馈 */}
        <button 
          onClick={onFeedbackClick}
          className="p-1.5 rounded hover:bg-studio-100"
          title="意见反馈 (GitHub Issues)"
        >
          <MessageSquarePlus size={16} className="text-studio-500" />
        </button>

        {/* 分割线 */}
        <div className="w-px h-5 bg-studio-200 mx-1"></div>

        {/* 状态图标 */}
        <div className="flex items-center gap-1 px-2">
          {isOnline ? (
            <Wifi size={14} className="text-green-500" />
          ) : (
            <WifiOff size={14} className="text-studio-400" />
          )}
          <Volume2 size={14} className="text-studio-500" />
          <Battery size={14} className="text-studio-500" />
        </div>

        {/* 时间 */}
        <button className="flex flex-col items-end px-2 py-1 rounded hover:bg-studio-100">
          <span className="text-sm font-medium text-ink-100">{formatTime(time)}</span>
          <span className="text-xs text-studio-500">{formatDate(time)}</span>
        </button>

        {/* 设置 */}
        <button 
          onClick={onSettingsClick}
          className="p-1.5 rounded hover:bg-studio-100"
          title="设置"
        >
          <Settings size={16} className="text-studio-500" />
        </button>
      </div>
    </div>
  )
}
