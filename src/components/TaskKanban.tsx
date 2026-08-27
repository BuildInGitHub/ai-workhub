import { useState, useEffect } from 'react'
import { 
  X, Plus, ChevronLeft, Trash2, Edit,
  Circle, CircleDot, CheckCircle2, GripVertical,
  Calendar, Flag
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

export default function TaskKanban({ parentTask, onClose, onChanged }: TaskKanbanProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [dragOver, setDragOver] = useState<string | null>(null)        // 列
  const [dragOverId, setDragOverId] = useState<string | null>(null)    // 卡片
  const [dragOverPos, setDragOverPos] = useState<'above' | 'below' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high', due_date: '' })
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    loadSubtasks()
  }, [parentTask.id])

  const loadSubtasks = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM tasks WHERE parent_id = ?",
        [parentTask.id]
      )
      if (result.data) {
        const items = result.data.map((t: any) => ({
          ...t,
          completed: Boolean(t.completed),
          status: t.status || (t.completed ? 'done' : 'todo'),
          position: typeof t.position === 'number' ? t.position : 9999
        }))
        // 按 position 排序（兼容旧数据无 position）
        items.sort((a: any, b: any) => (a.position - b.position) || String(a.created_at).localeCompare(String(b.created_at)))
        setSubtasks(items)
      }
    } catch (error) {
      console.error('加载子任务失败:', error)
    }
  }

  const getStatus = (t: Task): 'todo' | 'doing' | 'done' => {
    return t.status || (t.completed ? 'done' : 'todo')
  }

  // 列内任务（保持顺序）
  const colItems = (status: 'todo' | 'doing' | 'done') => subtasks.filter(t => getStatus(t) === status)

  // 持久化整列顺序（position 为列内下标），并合并重建完整状态（不能丢其他列）
  const persistColumn = async (colKey: 'todo' | 'doing' | 'done', items: Task[]) => {
    for (let i = 0; i < items.length; i++) {
      await window.electronAPI?.db.query(
        "UPDATE tasks SET position = ?, updated_at = datetime('now') WHERE id = ?",
        [i, items[i].id]
      )
    }
    // 按 待办→进行中→已完成 列顺序合并，保证其他列任务不丢失
    const full = [
      ...(colKey === 'todo' ? items : colItems('todo')),
      ...(colKey === 'doing' ? items : colItems('doing')),
      ...(colKey === 'done' ? items : colItems('done')),
    ]
    setSubtasks(full)
  }

  // 添加子任务（排在列尾）
  const addSubtask = async (status: 'todo' | 'doing' | 'done') => {
    if (!window.electronAPI || !newTitle.trim()) return
    try {
      const completed = status === 'done' ? 1 : 0
      const position = colItems(status).length
      await window.electronAPI.db.query(
        "INSERT INTO tasks (id, title, description, priority, due_date, completed, status, parent_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [uuidv4(), newTitle.trim(), '', 'medium', null, completed, status, parentTask.id, position]
      )
      setNewTitle('')
      loadSubtasks()
      onChanged()
    } catch (error) {
      console.error('添加子任务失败:', error)
    }
  }

  // 移动/排序：同列垂直调整，跨列水平移动
  const moveTask = async (task: Task, targetStatus: 'todo' | 'doing' | 'done', insertIndex: number) => {
    if (!window.electronAPI) return
    const srcStatus = getStatus(task)
    const srcCol = colItems(srcStatus)
    const targetCol = colItems(targetStatus)

    try {
      if (srcStatus === targetStatus) {
        // 同列排序
        const from = srcCol.findIndex(t => t.id === task.id)
        if (from === -1 || from === insertIndex) return
        const newCol = [...srcCol]
        newCol.splice(from, 1)
        // 关键：向下移动时，移除自身后目标索引会前移一位，需要修正
        const adjustedIdx = from < insertIndex ? insertIndex - 1 : insertIndex
        newCol.splice(adjustedIdx, 0, task)
        await persistColumn(srcStatus, newCol)
      } else {
        // 跨列移动
        const completed = targetStatus === 'done' ? 1 : 0
        await window.electronAPI.db.query(
          "UPDATE tasks SET status = ?, completed = ?, position = ?, updated_at = datetime('now') WHERE id = ?",
          [targetStatus, completed, insertIndex, task.id]
        )
        // 原列重新编号
        const newSrc = srcCol.filter(t => t.id !== task.id)
        for (let i = 0; i < newSrc.length; i++) {
          await window.electronAPI.db.query(
            "UPDATE tasks SET position = ? WHERE id = ?",
            [i, newSrc[i].id]
          )
        }
        loadSubtasks()
      }
      onChanged()
    } catch (error) {
      console.error('移动任务失败:', error)
    }
  }

  // 拖到卡片上：垂直定位 + 水平落列
  const handleDropOnCard = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const targetCol = getStatus(subtasks.find(t => t.id === targetId) as Task)
    const dragId = e.dataTransfer.getData('text/plain')
    const dragged = subtasks.find(t => t.id === dragId)
    if (!dragged) { resetDrag(); return }
    const targetColItems = colItems(targetCol)
    const targetIdx = targetColItems.findIndex(t => t.id === targetId)
    const insertIdx = dragOverPos === 'below' ? targetIdx + 1 : targetIdx
    resetDrag()
    moveTask(dragged, targetCol, insertIdx)
  }

  // 拖到列空白区域：追加到列尾
  const handleDropOnColumn = (e: React.DragEvent, status: 'todo' | 'doing' | 'done') => {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    const dragged = subtasks.find(t => t.id === dragId)
    if (!dragged) { resetDrag(); return }
    const insertIdx = colItems(status).length
    resetDrag()
    moveTask(dragged, status, insertIdx)
  }

  const resetDrag = () => {
    setDragOver(null)
    setDragOverId(null)
    setDragOverPos(null)
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

  // 打开编辑弹窗（完整修改：标题/描述/优先级/截止日期）
  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || ''
    })
  }

  // 保存修改
  const saveEdit = async () => {
    if (!window.electronAPI || !editingTask || !editForm.title.trim()) return
    try {
      await window.electronAPI.db.query(
        "UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?",
        [editForm.title.trim(), editForm.description, editForm.priority, editForm.due_date || null, editingTask.id]
      )
      setEditingTask(null)
      loadSubtasks()
      onChanged()
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
              <p className="text-xs text-studio-400">定制看板 · {subtasks.length} 个子任务 · 拖拽卡片可跨列移动或列内排序</p>
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
            const items = colItems(col.key)
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
                onDragLeave={() => setDragOver(prev => prev === col.key ? null : prev)}
                onDrop={(e) => handleDropOnColumn(e, col.key)}
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
                  {items.map((task, idx) => (
                    <div key={task.id} className="relative">
                      {/* 上方插入指示线 */}
                      {dragOverId === task.id && dragOverPos === 'above' && (
                        <div className="absolute -top-[5px] left-0 right-0 h-0.5 bg-caramel-400 rounded-full z-10" />
                      )}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDragOver(col.key)
                          setDragOverId(task.id)
                          // 根据鼠标在卡片上/下半部决定插入位置
                          const rect = e.currentTarget.getBoundingClientRect()
                          setDragOverPos(e.clientY < rect.top + rect.height / 2 ? 'above' : 'below')
                        }}
                        onDragLeave={(e) => {
                          // 仅当离开当前卡片时清除
                          const rect = e.currentTarget.getBoundingClientRect()
                          if (e.clientY < rect.top || e.clientY > rect.bottom) {
                            if (dragOverId === task.id) { setDragOverId(null); setDragOverPos(null) }
                          }
                        }}
                        onDrop={(e) => handleDropOnCard(e, task.id)}
                        className={`group bg-white rounded-xl p-3 shadow-soft border cursor-grab active:cursor-grabbing transition-all hover:shadow-medium ${
                          getStatus(task) === 'done' ? 'opacity-60' : ''
                        } ${dragOverId === task.id ? 'border-caramel-300' : 'border-studio-200'}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={14} className="mt-0.5 text-studio-300 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${getStatus(task) === 'done' ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                              {task.title}
                            </p>
                            {/* 优先级与截止日期 */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${priorityColors[task.priority]}`}>
                                {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                              </span>
                              {task.due_date && (
                                <span className="flex items-center gap-1 text-xs text-studio-400">
                                  <Calendar size={12} className="text-studio-400" />
                                  {task.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1 rounded-md hover:bg-studio-100 text-studio-400"
                              title="编辑（标题/描述/优先级/截止日期）"
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
                      {/* 下方插入指示线 */}
                      {dragOverId === task.id && dragOverPos === 'below' && (
                        <div className="absolute -bottom-[5px] left-0 right-0 h-0.5 bg-caramel-400 rounded-full z-10" />
                      )}
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

      {/* 编辑子任务弹窗 */}
      {editingTask && (
        <div className="fixed inset-0 bg-ink-400/40 flex items-center justify-center z-[95] backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingTask(null) }}>
          <div className="bg-white rounded-2xl p-6 w-[440px] shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold">编辑子任务</h3>
              <button onClick={() => setEditingTask(null)} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">标题</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="输入任务标题"
                  className="input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="输入任务描述（可选）"
                  rows={5}
                  className="input resize-y min-h-[110px] max-h-64"
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
                        onClick={() => setEditForm({ ...editForm, priority: p })}
                        className={`py-2 rounded-lg text-sm transition-colors ${
                          editForm.priority === p
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
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEditingTask(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editForm.title.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-gradient-to-r from-caramel-400 to-caramel-500 text-white hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
