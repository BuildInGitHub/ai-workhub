import { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit,
  X,
  Flag,
  Calendar,
  Search,
  Filter,
  TrendingUp
} from 'lucide-react'
import type { Task } from '../types'
import { v4 as uuidv4 } from 'uuid'

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: ''
  })

  useEffect(() => {
    loadTasks()
    
    // 监听标签页显示状态，数据变化时刷新
    const handleVisibility = () => {
      if (!document.hidden) {
        loadTasks()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const loadTasks = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM tasks ORDER BY completed ASC, created_at DESC"
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (filter === 'active') return matchesSearch && !task.completed
    if (filter === 'completed') return matchesSearch && task.completed
    return matchesSearch
  })

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length
  }

  const toggleComplete = async (task: Task) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query(
        "UPDATE tasks SET completed = ?, updated_at = datetime('now') WHERE id = ?",
        [task.completed ? 0 : 1, task.id]
      )
      loadTasks()
    } catch (error) {
      console.error('更新任务失败:', error)
    }
  }

  const handleSave = async () => {
    console.log('[TaskManager] handleSave called, formData:', formData)
    console.log('[TaskManager] window.electronAPI:', window.electronAPI)
    
    if (!window.electronAPI) {
      console.error('[TaskManager] electronAPI not available')
      return
    }
    
    if (!formData.title) {
      console.warn('[TaskManager] title is empty')
      return
    }
    
    try {
      const taskId = uuidv4()
      const sql = "INSERT INTO tasks (id, title, description, priority, due_date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))"
      const params = [taskId, formData.title, formData.description, formData.priority, formData.due_date || null]
      console.log('[TaskManager] Executing SQL:', sql)
      console.log('[TaskManager] Params:', params)
      
      const result = await window.electronAPI.db.query(sql, params)
      console.log('[TaskManager] Result:', result)
      
      // 重新加载任务列表
      await loadTasks()
      closeModal()
    } catch (error) {
      console.error('保存任务失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query("DELETE FROM tasks WHERE id = ?", [id])
      loadTasks()
    } catch (error) {
      console.error('删除任务失败:', error)
    }
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || ''
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingTask(null)
    setFormData({ title: '', description: '', priority: 'medium', due_date: '' })
  }

  const priorityColors = {
    low: 'bg-green-100 text-green-600',
    medium: 'bg-yellow-100 text-yellow-600',
    high: 'bg-red-100 text-red-600'
  }

  const priorityBgColors = {
    low: 'from-green-400 to-green-500',
    medium: 'from-yellow-400 to-yellow-500',
    high: 'from-red-400 to-red-500'
  }

  return (
    <div className="h-full flex flex-col p-6 bg-studio-50">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-ink-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white">
            <CheckSquare size={22} />
          </div>
          任务管理
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          新建任务
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-studio-100">
              <TrendingUp size={22} className="text-studio-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.total}</p>
              <p className="text-sm text-studio-500">总任务</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-caramel-50">
              <CheckSquare size={22} className="text-caramel-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.active}</p>
              <p className="text-sm text-studio-500">进行中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50">
              <CheckSquare size={22} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{stats.completed}</p>
              <p className="text-sm text-studio-500">已完成</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-studio-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-studio-200 focus:outline-none focus:border-caramel-400 focus:ring-2 focus:ring-caramel-100"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-studio-200">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-caramel-400 text-white' 
                  : 'text-studio-500 hover:text-ink-100'
              }`}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-studio-400">
            <div className="w-20 h-20 rounded-2xl bg-studio-100 flex items-center justify-center mb-4">
              <CheckSquare size={40} className="text-studio-300" />
            </div>
            <p>{searchQuery || filter !== 'all' ? '没有找到匹配的任务' : '暂无任务'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-2xl p-5 transition-all hover:shadow-medium border border-studio-200 ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleComplete(task)}
                    className="mt-1 w-6 h-6 rounded-lg border-2 border-studio-300 text-caramel-400 focus:ring-caramel-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-medium text-lg ${task.completed ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                        {task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : '高'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-studio-500 mb-2">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-studio-400 flex items-center gap-1">
                        <Calendar size={12} />
                        截止: {task.due_date}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-caramel-400"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-semibold">
                {editingTask ? '编辑任务' : '新建任务'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">任务标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入任务标题"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入任务描述（可选）"
                  rows={3}
                  className="input resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">优先级</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                        formData.priority === p 
                          ? `bg-gradient-to-r ${priorityBgColors[p]} text-white` 
                          : 'bg-studio-100 text-studio-500 hover:text-ink-100'
                      }`}
                    >
                      {p === 'low' ? '🟢 低' : p === 'medium' ? '🟡 中' : '🔴 高'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">截止日期</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input"
                />
              </div>
              
              <button onClick={handleSave} className="w-full btn btn-primary mt-2">
                {editingTask ? '保存修改' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
