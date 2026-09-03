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
  TrendingUp,
  ChevronRight,
  ChevronDown,
  ListTodo,
  GitBranch,
  Kanban,
  Eye
} from 'lucide-react'
import type { Task } from '../types'
import { v4 as uuidv4 } from 'uuid'
import ConfirmDialog from './ConfirmDialog'
import TaskKanban from './TaskKanban'

export default function TaskManager({ refreshKey }: { refreshKey?: number }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [kanbanTask, setKanbanTask] = useState<Task | null>(null)
  const [viewTask, setViewTask] = useState<Task | null>(null)  // 只读详情弹窗
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
    parent_id: '',
    status: 'todo' as 'todo' | 'doing' | 'done'
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
  }, [refreshKey])

  const loadTasks = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM tasks ORDER BY created_at ASC"
      )
      if (result.data) {
        setTasks(result.data.map((t: any) => ({
          ...t,
          completed: Boolean(t.completed),
          status: t.status || (t.completed ? 'done' : 'todo')
        })))
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  }

  // 一级任务与子任务分组（子任务按 position 排序）
  const parentTasks = tasks.filter(t => !t.parent_id)
  const getSubtasks = (parentId: string) => tasks
    .filter(t => t.parent_id === parentId)
    .sort((a, b) => ((a as any).position ?? 9999) - ((b as any).position ?? 9999) || String(a.created_at).localeCompare(String(b.created_at)))

  // 搜索过滤：一级任务匹配，或任一子任务匹配
  const matchesQuery = (task: Task): boolean => {
    const q = searchQuery.toLowerCase()
    return task.title.toLowerCase().includes(q) ||
      !!(task.description && task.description.toLowerCase().includes(q))
  }

  const filteredParents = parentTasks.filter(parent => {
    const subs = getSubtasks(parent.id)
    const matchParent = matchesQuery(parent)
    const matchSub = subs.some(matchesQuery)
    if (!matchParent && !matchSub) return false
    // 状态过滤
    if (filter === 'active') return !parent.completed || subs.some(s => !s.completed)
    if (filter === 'completed') return parent.completed || subs.some(s => s.completed)
    return true
  })

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length
  }

  const getStatus = (t: Task): 'todo' | 'doing' | 'done' => {
    return t.status || (t.completed ? 'done' : 'todo')
  }

  // 切换完成状态（同时更新看板状态）
  const toggleComplete = async (task: Task) => {
    if (!window.electronAPI) return
    const newDone = !task.completed
    try {
      await window.electronAPI.db.query(
        "UPDATE tasks SET completed = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
        [newDone ? 1 : 0, newDone ? 'done' : 'todo', task.id]
      )
      loadTasks()
    } catch (error) {
      console.error('更新任务失败:', error)
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI || !formData.title) return
    
    try {
      const completed = formData.status === 'done' ? 1 : 0
      if (editingTask) {
        await window.electronAPI.db.query(
          "UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, status = ?, completed = ?, updated_at = datetime('now') WHERE id = ?",
          [formData.title, formData.description, formData.priority, formData.due_date || null, formData.status, completed, editingTask.id]
        )
      } else {
        const parentId = formData.parent_id || null
        await window.electronAPI.db.query(
          "INSERT INTO tasks (id, title, description, priority, due_date, completed, status, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
          [uuidv4(), formData.title, formData.description, formData.priority, formData.due_date || null, completed, formData.status, parentId]
        )
      }
      
      loadTasks()
      closeModal()
    } catch (error) {
      console.error('保存任务失败:', error)
    }
  }

  // 删除任务（级联删除子任务）
  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query("DELETE FROM tasks WHERE parent_id = ?", [id])
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
      due_date: task.due_date || '',
      parent_id: task.parent_id || '',
      status: getStatus(task)
    })
    setShowAddModal(true)
  }

  // 为指定父任务添加子任务
  const openAddSubtask = (parentId: string) => {
    setEditingTask(null)
    setFormData({ title: '', description: '', priority: 'medium', due_date: '', parent_id: parentId, status: 'todo' })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingTask(null)
    setFormData({ title: '', description: '', priority: 'medium', due_date: '', parent_id: '', status: 'todo' })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-600',
    medium: 'bg-yellow-100 text-yellow-600',
    high: 'bg-red-100 text-red-600'
  }

  const priorityBgColors: Record<string, string> = {
    low: 'from-green-400 to-green-500',
    medium: 'from-yellow-400 to-yellow-500',
    high: 'from-red-400 to-red-500'
  }

  const statusLabels: Record<string, string> = {
    todo: '待办',
    doing: '进行中',
    done: '已完成'
  }

  const statusColors: Record<string, string> = {
    todo: 'text-studio-400',
    doing: 'text-caramel-500',
    done: 'text-green-500'
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
          onClick={() => { setEditingTask(null); setShowAddModal(true) }}
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
            placeholder="搜索任务（一级任务或子任务）..."
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

      {/* 任务列表（两级） */}
      <div className="flex-1 overflow-y-auto">
        {filteredParents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-studio-400">
            <div className="w-20 h-20 rounded-2xl bg-studio-100 flex items-center justify-center mb-4">
              <CheckSquare size={40} className="text-studio-300" />
            </div>
            <p>{searchQuery || filter !== 'all' ? '没有找到匹配的任务' : '暂无任务'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParents.map((task) => {
              const subtasks = getSubtasks(task.id)
              const doneCount = subtasks.filter(s => s.completed).length
              const isExpanded = expandedIds.has(task.id)
              const progress = subtasks.length > 0 ? Math.round(doneCount / subtasks.length * 100) : (task.completed ? 100 : 0)
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl transition-all border border-studio-200 ${task.completed ? 'opacity-70' : ''} hover:shadow-medium`}
                >
                  {/* 一级任务行 */}
                  <div className="flex items-start gap-4 p-5">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleComplete(task)}
                      className="mt-1 w-6 h-6 rounded-lg border-2 border-studio-300 text-caramel-400 focus:ring-caramel-200"
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setKanbanTask(task)} title="点击进入定制看板">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-medium text-lg ${task.completed ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                          {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                          {task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : '高'}
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${statusColors[getStatus(task)]}`}>
                          {statusLabels[getStatus(task)]}
                        </span>
                        {subtasks.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-studio-100 text-xs text-studio-500">
                            {doneCount}/{subtasks.length} 子任务
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-studio-500 mb-2 line-clamp-2">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-studio-400 flex items-center gap-1">
                          <Calendar size={12} />
                          截止: {task.due_date}
                        </p>
                      )}
                      {/* 子任务进度条 */}
                      {subtasks.length > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-studio-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-caramel-400 to-caramel-500 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-studio-400">{progress}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setKanbanTask(task)}
                        className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-caramel-400"
                        title="打开定制看板"
                      >
                        <Kanban size={18} />
                      </button>
                      <button
                        onClick={() => setViewTask(task)}
                        className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-blue-500"
                        title="查看详情（只读）"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openAddSubtask(task.id)}
                        className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-green-500"
                        title="添加子任务"
                      >
                        <GitBranch size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-caramel-400"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(task)}
                        className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                      {subtasks.length > 0 && (
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400"
                          title={isExpanded ? '收起子任务' : '展开子任务'}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 二级子任务 */}
                  {isExpanded && subtasks.length > 0 && (
                    <div className="px-5 pb-5 pl-16 space-y-2">
                      {subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className={`group flex items-start gap-3 p-3 rounded-xl bg-studio-50 border border-studio-100 ${
                            sub.completed ? 'opacity-60' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => toggleComplete(sub)}
                            className="mt-0.5 w-5 h-5 rounded-lg border-2 border-studio-300 text-caramel-400 focus:ring-caramel-200"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm ${sub.completed ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                                {sub.title}
                              </p>
                              <span className={`px-1.5 py-0.5 rounded-md text-xs ${priorityColors[sub.priority]}`}>
                                {sub.priority === 'low' ? '低' : sub.priority === 'medium' ? '中' : '高'}
                              </span>
                            </div>
                            {sub.due_date && (
                              <p className="text-xs text-studio-400 mt-0.5">截止: {sub.due_date}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setViewTask(sub)}
                              className="p-1.5 rounded-lg hover:bg-white text-studio-400 hover:text-blue-500"
                              title="查看详情"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-1.5 rounded-lg hover:bg-white text-studio-400 hover:text-caramel-400"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(sub)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-studio-400 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[640px] max-w-[92vw] shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-semibold">
                {editingTask ? '编辑任务' : formData.parent_id ? '添加子任务' : '新建任务'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
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

              {!editingTask && (
                <div>
                  <label className="block text-sm font-medium text-studio-500 mb-2">父任务（可选，作为子任务）</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="input"
                  >
                    <option value="">无（一级任务）</option>
                    {parentTasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['todo', 'doing', 'done'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s })}
                      className={`py-2.5 rounded-xl text-sm transition-colors ${
                        formData.status === s
                          ? 'bg-caramel-400 text-white'
                          : 'bg-studio-100 text-studio-500 hover:text-ink-100'
                      }`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    // 随内容自动长高，最多 320px，超出内部滚动
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = Math.min(el.scrollHeight, 320) + 'px'
                  }}
                  placeholder="输入任务描述（可选）"
                  rows={6}
                  className="input resize-y min-h-[130px] max-h-[320px] overflow-y-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-studio-500 mb-2">优先级</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p })}
                        className={`py-2 rounded-lg text-sm transition-colors ${
                          formData.priority === p
                            ? `bg-gradient-to-br ${priorityBgColors[p]} text-white`
                            : 'bg-studio-100 text-studio-500'
                        }`}
                      >
                        {p === 'low' ? '低' : p === 'medium' ? '中' : '高'}
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
              </div>
              
              <button onClick={handleSave} className="w-full btn btn-primary mt-2">
                {editingTask ? '保存修改' : formData.parent_id ? '添加子任务' : '新建任务'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认框 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除任务"
        message={deleteTarget?.parent_id
          ? "删除后该子任务将无法恢复，确定要删除吗？"
          : "删除后将同时删除其所有子任务，且无法恢复。确定要删除吗？"}
        itemName={deleteTarget?.title}
        confirmText="删除"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 定制看板 */}
      {kanbanTask && (
        <TaskKanban
          parentTask={kanbanTask}
          onClose={() => setKanbanTask(null)}
          onChanged={loadTasks}
        />
      )}

      {/* 只读详情弹窗（点 Eye 图标触发） */}
      {viewTask && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setViewTask(null) }}>
          <div className="bg-white rounded-2xl p-7 w-[720px] max-w-[94vw] max-h-[90vh] shadow-elevated animate-slideIn flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Eye size={18} className="text-blue-500" />
                任务详情
              </h3>
              <button onClick={() => setViewTask(null)} className="p-1.5 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {/* 标题（大字号） */}
              <div className="mb-5">
                <p className="text-2xl font-semibold text-ink-100 leading-tight">{viewTask.title}</p>
              </div>

              {/* 左右两列布局 */}
              <div className="grid grid-cols-[1fr_220px] gap-5">
                {/* 左列：描述 + 子任务 */}
                <div className="space-y-4">
                  {/* 描述 */}
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">描述</label>
                    <p className={`text-sm whitespace-pre-wrap rounded-lg p-3 leading-relaxed ${viewTask.description ? 'bg-studio-50 text-ink-100' : 'bg-studio-50 text-studio-400 italic'}`}>
                      {viewTask.description || '无描述'}
                    </p>
                  </div>

                  {/* 父任务（如果是子任务） */}
                  {viewTask.parent_id && (
                    <div>
                      <label className="block text-xs font-medium text-studio-500 mb-1.5">父任务</label>
                      <p className="text-sm text-ink-100">{tasks.find(t => t.id === viewTask.parent_id)?.title || viewTask.parent_id}</p>
                    </div>
                  )}

                  {/* 子任务（如果是父任务） */}
                  {(() => {
                    const subs = tasks.filter(t => t.parent_id === viewTask.id)
                    if (subs.length === 0) return null
                    const done = subs.filter(s => s.completed).length
                    return (
                      <div>
                        <label className="block text-xs font-medium text-studio-500 mb-1.5">
                          子任务（{done}/{subs.length}）
                        </label>
                        <div className="space-y-1.5 bg-studio-50 rounded-lg p-2.5">
                          {subs.map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-sm">
                              <span className={s.completed ? 'text-green-500' : 'text-studio-400'}>
                                {s.completed ? '✓' : '○'}
                              </span>
                              <span className={`flex-1 ${s.completed ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                                {s.title}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${priorityColors[s.priority]}`}>
                                {s.priority === 'low' ? '低' : s.priority === 'medium' ? '中' : '高'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* 右列：元信息（状态/优先级/截止/时间） */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">状态</label>
                    <span className={`inline-flex items-center gap-1.5 text-sm ${statusColors[getStatus(viewTask)]}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {statusLabels[getStatus(viewTask)]}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">优先级</label>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[viewTask.priority]}`}>
                      {viewTask.priority === 'low' ? '低' : viewTask.priority === 'medium' ? '中' : '高'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">完成</label>
                    <span className="text-sm">{viewTask.completed ? '✓ 已完成' : '○ 未完成'}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">截止日期</label>
                    <p className={`text-sm ${viewTask.due_date ? 'text-ink-100' : 'text-studio-400 italic'}`}>
                      {viewTask.due_date || '未设置'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">创建</label>
                    <p className="text-xs text-studio-500">{viewTask.created_at?.slice(0, 10) || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-studio-500 mb-1.5">更新</label>
                    <p className="text-xs text-studio-500">{viewTask.updated_at?.slice(0, 10) || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部：去看板 / 关闭 */}
            <div className="flex gap-2 mt-5 pt-4 border-t border-studio-100">
              <button
                onClick={() => { setKanbanTask(viewTask); setViewTask(null) }}
                className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
              >
                <Kanban size={16} />进入定制看板
              </button>
              <button onClick={() => setViewTask(null)} className="btn btn-primary px-6">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
