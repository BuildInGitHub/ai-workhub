import { useState, useEffect } from 'react'
import { 
  X, Plus, ChevronLeft, Trash2, Edit,
  Circle, CircleDot, CheckCircle2, GripVertical
} from 'lucide-react'
import type { Task } from '../types'
import { v4 as uuidv4 } from 'uuid'
import ConfirmDialog from './ConfirmDialog'

interface TaskKanbanProps {
  parentTask: Task
  onClose: () => void
  onChanged: () => void
}

const COLUMNS = [
  { key: 'todo' as const, label: '待办', icon: <Circle size={16} />, color: 'text-studio-400', bg: 'bg-studio-100', dot: 'bg-studio-300' },
  { key: 'doing' as const, label: '进行中', icon: <CircleDot size={16} />, color: 'text-caramel-500', bg: 'bg-caramel-50', dot: 'bg-caramel-400' },
  { key: 'done' as const, label: '已完成', icon: <CheckCircle2 size={16} />, color: 'text-green-500', bg: 'bg-green-50', dot: 'bg-green-400' },
]

export default function TaskKanban({ parentTask, onClose, onChanged }: TaskKanbanProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    loadSubtasks()
  }, [parentTask.id])

  const loadSubtasks = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC",
        [parentTask.id]
      )
      if (result.data) {
        setSubtasks(result.data.map((t: any) => ({
          ...t,
          completed: Boolean(t.completed),
          status: t.status || (t.completed ? 'done' : 'todo')
        })))
      }
    } catch (error) {
      console.error('加载子任务失败:', error)
    }
  }

  const getStatus = (t: Task): 'todo' | 'doing' | 'done' => {
    return t.status || (t.completed ? 'done' : 'todo')
  }

  // 添加子任务
  const addSubtask = async (status: 'todo' | 'doing' | 'done') => {
    if (!window.electronAPI || !newTitle.trim()) return
    try {
      const completed = status === 'done' ? 1 : 0
      await window.electronAPI.db.query(
        "INSERT INTO tasks (id, title, description, priority, due_date, completed, status, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [uuidv4(), newTitle.trim(), '', 'medium', null, completed, status, parentTask.id]
      )
      setNewTitle('')
      loadSubtasks()
      onChanged()
    } catch (error) {
      console.error('添加子任务失败:', error)
    }
  }

  // 移动子任务到其他列
  const moveTask = async (task: Task, newStatus: 'todo' | 'doing' | 'done') => {
    if (!window.electronAPI || getStatus(task) === newStatus) return
    try {
      const completed = newStatus === 'done' ? 1 : 0
      await window.electronAPI.db.query(
        "UPDATE tasks SET status = ?, completed = ?, updated_at = datetime('now') WHERE id = ?",
        [newStatus, completed, task.id]
      )
      loadSubtasks()
      onChanged()
    } catch (error) {
      console.error('移动任务失败:', error)
    }
  }

  // 拖拽
  const handleDrop = (e: React.DragEvent, status: 'todo' | 'doing' | 'done') => {
    e.preventDefault()
    setDragOver(null)
    const taskId = e.dataTransfer.getData('text/plain')
    const task = subtasks.find(t => t.id === taskId)
    if (task) moveTask(task, status)
  }

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query("DELETE FROM tasks WHERE id = ?", [id])
      loadSubtasks()
      onChanged()
    } catch (error) {
      console.error('删除子任务失败:', error)
    }
  }

  const updateTitle = async (task: Task, title: string) => {
    if (!window.electronAPI || !title.trim()) return
    try {
      await window.electronAPI.db.query(
        "UPDATE tasks SET title = ?, updated_at = datetime('now') WHERE id = ?",
        [title.trim(), task.id]
      )
      loadSubtasks()
    } catch (error) {
      console.error('更新子任务失败:', error)
    }
  }

  const priorityColors: Record<string, string> = {
    low: 'text-green-500', medium: 'text-yellow-500', high: 'text-red-500'
  }

  return (
    <div className="fixed inset-0 bg-ink-400/40 flex items-center justify-center z-[90] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-studio-50 rounded-3xl w-[1000px] h-[700px] max-w-[95vw] shadow-elevated flex flex-col overflow-hidden animate-slideIn">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-studio-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-studio-100 text-studio-500"
              title="返回任务列表"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-100 truncate">{parentTask.title}</h3>
              <p className="text-xs text-studio-400">定制看板 · {subtasks.length} 个子任务</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColors[parentTask.priority] || ''}`}>
              {parentTask.priority === 'high' ? '高优先级' : parentTask.priority === 'medium' ? '中优先级' : '低优先级'}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-studio-100 text-studio-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 看板列 */}
        <div className="flex-1 flex gap-4 p-5 overflow-hidden">
          {COLUMNS.map((col) => {
            const items = subtasks.filter(t => getStatus(t) === col.key)
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
                onDragLeave={() => setDragOver(prev => prev === col.key ? null : prev)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`flex-1 flex flex-col rounded-2xl ${col.bg} transition-colors ${
                  dragOver === col.key ? 'ring-2 ring-caramel-300' : ''
                }`}
              >
                {/* 列头 */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={col.color}>{col.icon}</span>
                    <span className="text-sm font-medium text-ink-100">{col.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-xs ${col.dot} text-white`}>{items.length}</span>
                  </div>
                  <button
                    onClick={() => addSubtask(col.key)}
                    className="p-1.5 rounded-lg hover:bg-white text-studio-400 hover:text-caramel-400 transition-colors"
                    title={`在${col.label}中添加子任务`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* 列内容 */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {items.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className={`group bg-white rounded-xl p-3 shadow-soft border border-studio-200 cursor-grab active:cursor-grabbing transition-all hover:shadow-medium ${
                        getStatus(task) === 'done' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} className="mt-0.5 text-studio-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {editingTask?.id === task.id ? (
                            <input
                              autoFocus
                              defaultValue={task.title}
                              onBlur={(e) => {
                                updateTitle(task, e.target.value)
                                setEditingTask(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTitle(task, (e.target as HTMLInputElement).value)
                                  setEditingTask(null)
                                }
                                if (e.key === 'Escape') setEditingTask(null)
                              }}
                              className="w-full text-sm px-2 py-1 bg-white border border-caramel-300 rounded-lg focus:outline-none"
                            />
                          ) : (
                            <p className={`text-sm ${getStatus(task) === 'done' ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                              {task.title}
                            </p>
                          )}
                          {task.due_date && (
                            <p className="text-xs text-studio-400 mt-1">📅 {task.due_date}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1 rounded-md hover:bg-studio-100 text-studio-400"
                            title="重命名"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(task)}
                            className="p-1 rounded-md hover:bg-red-50 text-studio-400 hover:text-red-500"
                            title="删除"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center text-xs text-studio-400 py-6 border border-dashed border-studio-200 rounded-xl">
                      拖拽任务到这里
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部快速添加 */}
        <div className="px-6 py-3 bg-white border-t border-studio-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubtask('todo')}
              placeholder="输入子任务标题，回车添加到「待办」..."
              className="flex-1 input"
            />
            <button
              onClick={() => addSubtask('todo')}
              className="px-5 btn btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              添加子任务
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除子任务"
        message="删除后该子任务将无法恢复，确定要删除吗？"
        itemName={deleteTarget?.title}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
