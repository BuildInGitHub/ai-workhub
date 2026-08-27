import { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react'
import type { Task } from '../types'

type ViewMode = 'month' | 'week' | 'day'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  type: 'task' | 'schedule'
}

export default function Calendar({ refreshKey }: { refreshKey?: number }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

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

  // 获取日历数据
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: Date[] = []
    
    // 填充月初空白
    const startWeekDay = firstDay.getDay()
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push(d)
    }
    
    // 填充月中
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // 填充月末空白
    const endWeekDay = lastDay.getDay()
    for (let i = 1; i < 7 - endWeekDay; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }

  // 获取某天的任务
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr))
  }

  // 判断是否是今天
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // 判断是否是当前月
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  // 月份名称
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="h-full flex flex-col bg-studio-50">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-studio-200">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-100">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-studio-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-studio-100"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1.5 text-sm bg-studio-100 rounded-lg hover:bg-studio-200"
            >
              今天
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex bg-studio-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === mode 
                    ? 'bg-white shadow-sm text-ink-100' 
                    : 'text-studio-500 hover:text-ink-100'
                }`}
              >
                {mode === 'month' ? '月' : mode === 'week' ? '周' : '日'}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowEventModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            新建日程
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 bg-white border-b border-studio-200">
        {weekDays.map((day, i) => (
          <div 
            key={i} 
            className={`py-3 text-center text-sm font-medium ${
              i === 0 || i === 6 ? 'text-red-400' : 'text-studio-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-2">
          {getCalendarDays().map((date, index) => {
            const dayTasks = getTasksForDate(date)
            const today = isToday(date)
            const currentMonth = isCurrentMonth(date)
            
            return (
              <div
                key={index}
                onClick={() => setSelectedDate(date)}
                className={`
                  min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer
                  ${today 
                    ? 'bg-caramel-50 border-caramel-300 ring-2 ring-caramel-200' 
                    : currentMonth 
                      ? 'bg-white border-studio-200 hover:border-caramel-300' 
                      : 'bg-studio-50 border-studio-200 opacity-50'
                  }
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${today ? 'text-caramel-600' : currentMonth ? 'text-ink-100' : 'text-studio-400'}
                `}>
                  {date.getDate()}
                </div>
                
                {/* 任务列表 */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`
                        text-xs px-1.5 py-0.5 rounded truncate
                        ${task.completed 
                          ? 'bg-studio-100 text-studio-400 line-through' 
                          : task.priority === 'high' 
                            ? 'bg-red-100 text-red-600' 
                            : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-green-100 text-green-600'
                        }
                      `}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-studio-400">
                      +{dayTasks.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 选中日期的任务列表 */}
      {selectedDate && (
        <div className="bg-white border-t border-studio-200 p-4 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-ink-100">
              {selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </h3>
            <button 
              onClick={() => setSelectedDate(null)}
              className="text-studio-400 hover:text-ink-100"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {getTasksForDate(selectedDate).length === 0 ? (
              <p className="text-studio-400 text-sm">暂无任务</p>
            ) : (
              getTasksForDate(selectedDate).map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-studio-50 rounded-lg">
                  <input 
                    type="checkbox" 
                    checked={task.completed}
                    className="rounded"
                  />
                  <span className={task.completed ? 'line-through text-studio-400' : ''}>
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
