import { useState, useEffect } from 'react'
import { 
  Zap, 
  Plus, 
  Trash2, 
  Edit,
  X,
  FolderOpen,
  Link,
  File,
  AppWindow,
  GripVertical,
  ExternalLink
} from 'lucide-react'
import type { QuickLaunchItem } from '../types'
import { v4 as uuidv4 } from 'uuid'

const typeIcons = {
  file: <File size={24} />,
  folder: <FolderOpen size={24} />,
  link: <Link size={24} />,
  app: <AppWindow size={24} />
}

const typeLabels = {
  file: '文件',
  folder: '文件夹',
  link: '链接',
  app: '应用'
}

const typeBgColors = {
  file: 'bg-blue-50 text-blue-500',
  folder: 'bg-amber-50 text-amber-500',
  link: 'bg-green-50 text-green-500',
  app: 'bg-purple-50 text-purple-500'
}

export default function QuickLaunch() {
  const [items, setItems] = useState<QuickLaunchItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<QuickLaunchItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'folder' as 'file' | 'folder' | 'link' | 'app',
    path: ''
  })

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM quick_launch ORDER BY position ASC"
      )
      if (result.data) {
        setItems(result.data)
      }
    } catch (error) {
      console.error('加载快速启动项失败:', error)
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI || !formData.name || !formData.path) return
    
    try {
      if (editingItem) {
        await window.electronAPI.db.query(
          "UPDATE quick_launch SET name = ?, type = ?, path = ? WHERE id = ?",
          [formData.name, formData.type, formData.path, editingItem.id]
        )
      } else {
        await window.electronAPI.db.query(
          "INSERT INTO quick_launch (id, name, type, path, position) VALUES (?, ?, ?, ?, ?)",
          [uuidv4(), formData.name, formData.type, formData.path, items.length]
        )
      }
      
      loadItems()
      closeModal()
    } catch (error) {
      console.error('保存快速启动项失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query("DELETE FROM quick_launch WHERE id = ?", [id])
      loadItems()
    } catch (error) {
      console.error('删除快速启动项失败:', error)
    }
  }

  const openItem = (item: QuickLaunchItem) => {
    if (item.type === 'link') {
      // 确保链接有 https 前缀
      const url = item.path.match(/^https?:\/\//i) ? item.path : 'https://' + item.path
      window.electronAPI?.shell.openExternal(url)
    } else {
      // 使用 openPath 打开文件、文件夹、应用
      window.electronAPI?.shell.openPath?.(item.path)
    }
  }

  const handleSelectPath = async () => {
    if (!window.electronAPI) return
    
    if (formData.type === 'link') {
      return
    }
    
    let path: string | null = null
    const dialogAPI = window.electronAPI.dialog
    
    if (formData.type === 'folder') {
      path = await dialogAPI.selectDirectory()
    } else if (formData.type === 'file') {
      if (dialogAPI.selectFile) {
        path = await dialogAPI.selectFile()
      } else {
        alert('文件选择功能不可用')
        return
      }
    } else if (formData.type === 'app') {
      if (dialogAPI.selectApp) {
        path = await dialogAPI.selectApp()
      } else {
        alert('应用选择功能不可用')
        return
      }
    }
    
    if (path) {
      // 自动从路径提取名称
      const name = path.split(/[/\\]/).pop() || formData.name
      setFormData({ ...formData, path, name: formData.name || name })
    }
  }

  const openEditModal = (item: QuickLaunchItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      type: item.type,
      path: item.path
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingItem(null)
    setFormData({ name: '', type: 'folder', path: '' })
  }

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return
    
    const newItems = [...items]
    const [moved] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, moved)
    setItems(newItems)
    
    if (!window.electronAPI) return
    for (let i = 0; i < newItems.length; i++) {
      await window.electronAPI.db.query(
        "UPDATE quick_launch SET position = ? WHERE id = ?",
        [i, newItems[i].id]
      )
    }
  }

  return (
    <div className="h-full flex flex-col p-6 bg-studio-50">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-ink-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-caramel-400 to-caramel-500 flex items-center justify-center text-white">
            <Zap size={22} />
          </div>
          快速启动
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          添加
        </button>
      </div>

      <p className="text-studio-500 mb-6">
        常用文件、文件夹、链接和应用程序的快捷入口
      </p>

      {/* 快速启动项列表 */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-studio-400">
            <div className="w-20 h-20 rounded-2xl bg-studio-100 flex items-center justify-center mb-4">
              <Zap size={40} className="text-studio-300" />
            </div>
            <p>暂无快速启动项</p>
            <p className="text-sm mt-1">添加常用的文件、文件夹或链接</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 hover:shadow-medium transition-all group cursor-pointer border border-studio-200"
                onClick={() => openItem(item)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl ${typeBgColors[item.type]}`}>
                    {typeIcons[item.type]}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveItem(index, 'up')
                      }}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 disabled:opacity-30"
                    >
                      <GripVertical size={14} className="rotate-90" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveItem(index, 'down')
                      }}
                      disabled={index === items.length - 1}
                      className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 disabled:opacity-30"
                    >
                      <GripVertical size={14} className="-rotate-90" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(item)
                      }}
                      className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 hover:text-caramel-400"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-medium text-ink-100 truncate mb-1">{item.name}</h3>
                <p className="text-xs text-studio-400 truncate mb-2">{item.path}</p>
                <span className="inline-block px-2 py-1 bg-studio-100 rounded-lg text-xs text-studio-500">
                  {typeLabels[item.type]}
                </span>
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
                {editingItem ? '编辑快速启动' : '添加快速启动'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">类型</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['folder', 'file', 'link', 'app'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type, path: '' })}
                      className={`py-3 rounded-xl text-sm transition-colors flex flex-col items-center gap-1 ${
                        formData.type === type 
                          ? `bg-caramel-400 text-white` 
                          : 'bg-studio-100 text-studio-500 hover:text-ink-100'
                      }`}
                    >
                      {typeIcons[type]}
                      {typeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入名称"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">
                  {formData.type === 'link' ? '网址' : '路径'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder={formData.type === 'link' ? 'https://example.com' : '选择路径'}
                    className="input"
                  />
                  {formData.type !== 'link' && (
                    <button
                      onClick={handleSelectPath}
                      className="px-4 btn btn-secondary"
                    >
                      选择
                    </button>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleSave} 
                disabled={!formData.name || !formData.path}
                className="w-full btn btn-primary disabled:opacity-50 mt-2"
              >
                {editingItem ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
