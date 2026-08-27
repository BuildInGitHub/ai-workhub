import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import type { Tab, Task } from '../types'

interface MiniCalendarProps {
  onAddTab: (type: Tab['type'], title: string) => void
  refreshKey?: number
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

export default function MiniCalendar({ onAddTab, refreshKey }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    loadTasks()
  }, [refreshKey])

  const loadTasks = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM tasks ORDER BY due_date ASC"
      )
      if (result.data) {
        setTasks(result.data.map((t: any) => ({
          ...t,
          completed: Boolean(t.completed)
        })))
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  }

  // 获取当月日期格子
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: Date[] = []
    const startWeekDay = firstDay.getDay()
    for (let i = startWeekDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    const endWeekDay = lastDay.getDay()
    for (let i = 1; i < 7 - endWeekDay; i++) {
      days.push(new Date(year, month + 1, i))
    }
    return days
  }

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr))
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  // 即将到来的日程（含今天，最多 5 条）
  const upcoming = tasks
    .filter(t => t.due_date && !t.completed)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .filter(t => (t.due_date || '') >= new Date().toISOString().split('T')[0])
    .slice(0, 5)

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1))
      return d
    })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const diffDays = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000)
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '明天'
    if (diffDays === 2) return '后天'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-100 text-red-600'
    if (p === 'medium') return 'bg-yellow-100 text-yellow-600'
    return 'bg-green-100 text-green-600'
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-ink-100 flex items-center gap-2">
          <CalendarIcon size={18} className="text-caramel-400" />
          日程
        </h3>
        <button 
          onClick={() => onAddTab('calendar', '日历')}
          className="text-sm text-caramel-400 hover:text-caramel-500 flex items-center gap-1"
        >
          查看全部 <ArrowRight size={14} />
        </button>
      </div>

      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-ink-100">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day, i) => (
          <div key={i} className={`py-1 text-center text-xs font-medium ${i === 0 || i === 6 ? 'text-red-400' : 'text-studio-400'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {getCalendarDays().map((date, index) => {
          const dayTasks = getTasksForDate(date)
          const today = isToday(date)
          const inMonth = isCurrentMonth(date)
          return (
            <div
              key={index}
              className={`relative h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                today 
                  ? 'bg-caramel-400 text-white font-semibold'
                  : inMonth 
                    ? 'text-ink-100 hover:bg-studio-100'
                    : 'text-studio-300'
              }`}
            >
              {date.getDate()}
              {dayTasks.length > 0 && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${today ? 'bg-white' : 'bg-caramel-400'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* 即将到来的日程 */}
      <div className="border-t border-studio-100 pt-3">
        <p className="text-xs font-medium text-studio-400 mb-2">即将到来</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-studio-400 text-center py-3">近期暂无日程安排</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded-lg text-xs flex-shrink-0 ${priorityColor(task.priority)}`}>
                  {formatDate(task.due_date || '')}
                </span>
                <span className="text-ink-100 truncate flex-1">{task.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
