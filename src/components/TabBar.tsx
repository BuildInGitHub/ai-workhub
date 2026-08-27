import { X, Plus, FolderOpen, Link, CheckSquare, Briefcase, Zap, Home, Calendar, Search } from 'lucide-react'
import type { Tab } from '../types'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onAddTab: (type: Tab['type'], title: string) => void
}

const tabIcons: Record<string, React.ReactNode> = {
  home: <Home size={16} />,
  files: <FolderOpen size={16} />,
  links: <Link size={16} />,
  tasks: <CheckSquare size={16} />,
  projects: <Briefcase size={16} />,
  'quick-launch': <Zap size={16} />,
  calendar: <Calendar size={16} />,
  search: <Search size={16} />
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onAddTab
}: TabBarProps) {
  return (
    <div className="flex items-center bg-white border-b border-studio-200 px-3 h-14">
      {/* 标签页列表 */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all duration-200 group min-w-0 ${
              activeTabId === tab.id
                ? 'bg-gradient-to-r from-caramel-400 to-caramel-500 text-white shadow-soft'
                : 'text-studio-500 hover:bg-studio-100 hover:text-ink-100'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={activeTabId === tab.id ? 'text-white' : 'text-caramel-400'}>
              {tabIcons[tab.type]}
            </span>
            <span className="text-sm font-medium whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis">
              {tab.title}
            </span>
            {tab.closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                className={`p-0.5 rounded-lg hover:bg-white/20 transition-opacity ${
                  activeTabId === tab.id 
                    ? 'text-white/70 hover:text-white' 
                    : 'text-studio-400 hover:text-ink-100'
                }`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 添加标签按钮 */}
      <div className="flex items-center ml-3">
        <div className="relative group">
          <button className="p-2.5 rounded-xl hover:bg-studio-100 transition-colors text-studio-500">
            <Plus size={20} />
          </button>
          
          {/* 下拉菜单 */}
          <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-elevated border border-studio-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[160px] overflow-hidden">
            <button
              onClick={() => onAddTab('files', '文件管理')}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-studio-100 text-left"
            >
              <FolderOpen size={18} className="text-caramel-400" />
              <span className="text-sm">文件管理</span>
            </button>
            <button
              onClick={() => onAddTab('links', '链接收藏')}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-studio-100 text-left"
            >
              <Link size={18} className="text-caramel-400" />
              <span className="text-sm">链接收藏</span>
            </button>
            <button
              onClick={() => onAddTab('tasks', '任务管理')}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-studio-100 text-left"
            >
              <CheckSquare size={18} className="text-caramel-400" />
              <span className="text-sm">任务管理</span>
            </button>
            <button
              onClick={() => onAddTab('projects', '项目管理')}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-studio-100 text-left"
            >
              <Briefcase size={18} className="text-caramel-400" />
              <span className="text-sm">项目管理</span>
            </button>
            <button
              onClick={() => onAddTab('quick-launch', '快速启动')}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-studio-100 text-left"
            >
              <Zap size={18} className="text-caramel-400" />
              <span className="text-sm">快速启动</span>
            </button>
            <button
              onClick={() => onAddTab('calendar', '日历')}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-studio-100 text-left rounded-b-lg"
            >
              <Calendar size={18} className="text-caramel-400" />
              <span className="text-sm">日历</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
