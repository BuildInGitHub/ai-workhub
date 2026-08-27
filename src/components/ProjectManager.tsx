import { useState, useEffect } from 'react'
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit,
  X,
  FolderOpen,
  Link,
  CheckSquare
} from 'lucide-react'
import type { Project, Link as LinkType, Task } from '../types'
import { v4 as uuidv4 } from 'uuid'
import ConfirmDialog from './ConfirmDialog'

const projectColors = [
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
]

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [pickerType, setPickerType] = useState<'link' | 'task' | null>(null)
  const [availableLinks, setAvailableLinks] = useState<LinkType[]>([])
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [projectLinks, setProjectLinks] = useState<LinkType[]>([])
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: projectColors[0]
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectItems()
    }
  }, [selectedProject])

  const loadProjects = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM projects ORDER BY created_at DESC"
      )
      if (result.data) {
        setProjects(result.data)
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    }
  }

  const loadProjectItems = async () => {
    if (!window.electronAPI || !selectedProject) return
    
    try {
      // 加载关联关系（JSON 存储不支持 JOIN，客户端匹配）
      const itemsResult = await window.electronAPI.db.query(
        "SELECT * FROM project_items WHERE project_id = ?",
        [selectedProject.id]
      )
      const relations = itemsResult.data || []
      
      const linkIds = relations.filter((r: any) => r.item_type === 'link').map((r: any) => r.item_id)
      const taskIds = relations.filter((r: any) => r.item_type === 'task').map((r: any) => r.item_id)

      // 客户端关联
      const linksResult = await window.electronAPI.db.query("SELECT * FROM links")
      const tasksResult = await window.electronAPI.db.query("SELECT * FROM tasks")
      
      const allLinks = linksResult.data || []
      const allTasks = (tasksResult.data || []).map((t: any) => ({ ...t, completed: Boolean(t.completed) }))
      
      setProjectLinks(allLinks.filter((l: any) => linkIds.includes(l.id)))
      setProjectTasks(allTasks.filter((t: any) => taskIds.includes(t.id)))
    } catch (error) {
      console.error('加载项目内容失败:', error)
    }
  }

  // 添加关联
  const addProjectItem = async (itemType: 'link' | 'task', itemId: string) => {
    if (!window.electronAPI || !selectedProject) return
    try {
      await window.electronAPI.db.query(
        "INSERT INTO project_items (id, project_id, item_type, item_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
        [uuidv4(), selectedProject.id, itemType, itemId]
      )
      loadProjectItems()
    } catch (error) {
      console.error('添加关联失败:', error)
    }
  }

  // 移除关联（不删除原链接/任务本身）
  const removeProjectItem = async (itemType: 'link' | 'task', itemId: string) => {
    if (!window.electronAPI || !selectedProject) return
    try {
      const relResult = await window.electronAPI.db.query(
        "SELECT * FROM project_items WHERE project_id = ?",
        [selectedProject.id]
      )
      const rel = (relResult.data || []).find((r: any) => r.item_type === itemType && r.item_id === itemId)
      if (rel) {
        await window.electronAPI.db.query(
          "DELETE FROM project_items WHERE id = ?",
          [rel.id]
        )
        loadProjectItems()
      }
    } catch (error) {
      console.error('移除关联失败:', error)
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI || !formData.name) return
    
    try {
      if (editingProject) {
        await window.electronAPI.db.query(
          "UPDATE projects SET name = ?, description = ?, color = ?, updated_at = datetime('now') WHERE id = ?",
          [formData.name, formData.description, formData.color, editingProject.id]
        )
      } else {
        await window.electronAPI.db.query(
          "INSERT INTO projects (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
          [uuidv4(), formData.name, formData.description, formData.color]
        )
      }
      
      loadProjects()
      closeModal()
    } catch (error) {
      console.error('保存项目失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query("DELETE FROM projects WHERE id = ?", [id])
      if (selectedProject?.id === id) {
        setSelectedProject(null)
      }
      loadProjects()
    } catch (error) {
      console.error('删除项目失败:', error)
    }
  }

  // 打开选择器：加载所有可选的链接/任务（排除已关联的）
  const openPicker = async (type: 'link' | 'task') => {
    if (!window.electronAPI) return
    try {
      if (type === 'link') {
        const result = await window.electronAPI.db.query("SELECT * FROM links ORDER BY created_at DESC")
        const all = result.data || []
        const linkedIds = projectLinks.map(l => l.id)
        setAvailableLinks(all.filter((l: any) => !linkedIds.includes(l.id)))
      } else {
        const result = await window.electronAPI.db.query("SELECT * FROM tasks ORDER BY created_at DESC")
        const all = (result.data || []).map((t: any) => ({ ...t, completed: Boolean(t.completed) }))
        const linkedIds = projectTasks.map(t => t.id)
        setAvailableTasks(all.filter((t: any) => !linkedIds.includes(t.id)))
      }
      setPickerType(type)
    } catch (error) {
      console.error('加载可选列表失败:', error)
    }
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingProject(null)
    setFormData({ name: '', description: '', color: projectColors[0] })
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
  }

  return (
    <div className="h-full flex bg-studio-50">
      {/* 左侧项目列表 */}
      <div className="w-80 bg-white border-r border-studio-200 flex flex-col">
        <div className="p-5 border-b border-studio-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                <Briefcase size={18} />
              </div>
              项目
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 rounded-xl bg-caramel-400 text-white hover:bg-caramel-500"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {projects.length === 0 ? (
            <p className="text-studio-400 text-sm text-center py-8">暂无项目</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all ${
                    selectedProject?.id === project.id 
                      ? 'bg-caramel-50 ring-2 ring-caramel-200' 
                      : 'hover:bg-studio-50'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-100 truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-studio-400 truncate">{project.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(project)
                    }}
                    className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(project)
                    }}
                    className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧项目详情 */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {selectedProject ? (
          <>
            {/* 项目头部 */}
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: selectedProject.color }}
              />
              <h2 className="font-display text-xl font-semibold text-ink-100">{selectedProject.name}</h2>
            </div>
            
            {selectedProject.description && (
              <p className="text-studio-500 mb-6">{selectedProject.description}</p>
            )}

            {/* 关联内容 */}
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* 链接 */}
              <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink-100 flex items-center gap-2">
                    <Link size={18} className="text-green-500" />
                    关联链接
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-studio-400">{projectLinks.length}</span>
                    <button
                      onClick={() => openPicker('link')}
                      className="p-1.5 rounded-lg bg-caramel-50 text-caramel-500 hover:bg-caramel-100 transition-colors"
                      title="关联链接"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {projectLinks.length === 0 ? (
                    <p className="text-studio-400 text-sm text-center py-6">暂无关联链接，点击 + 添加</p>
                  ) : (
                    projectLinks.map((link) => (
                      <div
                        key={link.id}
                        className="group p-3 bg-studio-50 rounded-xl flex items-center justify-between"
                      >
                        <span className="text-sm text-ink-100 truncate">{link.title}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              const url = link.url.match(/^https?:\/\//i) ? link.url : 'https://' + link.url
                              window.electronAPI?.shell.openExternal(url)
                            }}
                            className="p-1.5 text-studio-400 hover:text-green-500"
                            title="打开链接"
                          >
                            <Link size={14} />
                          </button>
                          <button
                            onClick={() => removeProjectItem('link', link.id)}
                            className="p-1.5 text-studio-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="取消关联"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 任务 */}
              <div className="bg-white rounded-2xl p-5 border border-studio-200 shadow-soft overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink-100 flex items-center gap-2">
                    <CheckSquare size={18} className="text-purple-500" />
                    关联任务
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-studio-400">{projectTasks.length}</span>
                    <button
                      onClick={() => openPicker('task')}
                      className="p-1.5 rounded-lg bg-caramel-50 text-caramel-500 hover:bg-caramel-100 transition-colors"
                      title="关联任务"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {projectTasks.length === 0 ? (
                    <p className="text-studio-400 text-sm text-center py-6">暂无关联任务，点击 + 添加</p>
                  ) : (
                    projectTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group p-3 bg-studio-50 rounded-xl flex items-center gap-2 ${
                          task.completed ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          disabled
                          className="w-4 h-4 rounded"
                        />
                        <span className={`text-sm truncate flex-1 ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </span>
                        <button
                          onClick={() => removeProjectItem('task', task.id)}
                          className="p-1.5 text-studio-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="取消关联"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-studio-400">
            <div className="w-24 h-24 rounded-2xl bg-studio-100 flex items-center justify-center mb-4">
              <Briefcase size={48} className="text-studio-300" />
            </div>
            <p className="text-lg mb-1">选择一个项目查看详情</p>
            <p className="text-sm">或创建一个新项目</p>
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-semibold">
                {editingProject ? '编辑项目' : '新建项目'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">项目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入项目名称"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入项目描述（可选）"
                  rows={3}
                  className="input resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">项目颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {projectColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-xl transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-caramel-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <button onClick={handleSave} className="w-full btn btn-primary mt-2">
                {editingProject ? '保存修改' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 关联选择器弹窗 */}
      {pickerType && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[440px] shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                关联{pickerType === 'link' ? '链接' : '任务'}到「{selectedProject?.name}」
              </h3>
              <button onClick={() => setPickerType(null)} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 mb-4">
              {pickerType === 'link' ? (
                availableLinks.length === 0 ? (
                  <p className="text-studio-400 text-sm text-center py-8">
                    没有可关联的链接
                    <span className="block text-xs mt-1">先到「链接收藏」中添加链接</span>
                  </p>
                ) : (
                  availableLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => {
                        addProjectItem('link', link.id)
                        setPickerType(null)
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-caramel-50 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Link size={14} className="text-green-500" />
                      </div>
                      <span className="text-sm text-ink-100 truncate flex-1">{link.title}</span>
                      <Plus size={16} className="text-studio-300 group-hover:text-caramel-400 flex-shrink-0" />
                    </button>
                  ))
                )
              ) : (
                availableTasks.length === 0 ? (
                  <p className="text-studio-400 text-sm text-center py-8">
                    没有可关联的任务
                    <span className="block text-xs mt-1">先到「任务管理」中创建任务</span>
                  </p>
                ) : (
                  availableTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        addProjectItem('task', task.id)
                        setPickerType(null)
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-caramel-50 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <CheckSquare size={14} className="text-purple-500" />
                      </div>
                      <span className={`text-sm truncate flex-1 ${task.completed ? 'line-through text-studio-400' : 'text-ink-100'}`}>
                        {task.title}
                      </span>
                      <Plus size={16} className="text-studio-300 group-hover:text-caramel-400 flex-shrink-0" />
                    </button>
                  ))
                )
              )}
            </div>

            <button onClick={() => setPickerType(null)} className="w-full btn btn-secondary">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 删除项目确认框 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除项目"
        message="删除后项目及其关联内容将被移除，无法恢复。确定要删除吗？"
        itemName={deleteTarget?.name}
        confirmText="删除项目"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
