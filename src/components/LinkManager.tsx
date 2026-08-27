import { useState, useEffect } from 'react'
import { 
  Link, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Search,
  Edit,
  X,
  Tag
} from 'lucide-react'
import type { Link as LinkType } from '../types'
import { v4 as uuidv4 } from 'uuid'
import ConfirmDialog from './ConfirmDialog'

export default function LinkManager() {
  const [links, setLinks] = useState<LinkType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LinkType | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    tags: ''
  })

  useEffect(() => {
    loadLinks()
    
    // 监听标签页显示状态，数据变化时刷新
    const handleVisibility = () => {
      if (!document.hidden) {
        loadLinks()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const loadLinks = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM links ORDER BY created_at DESC"
      )
      if (result.data) {
        setLinks(result.data)
      }
    } catch (error) {
      console.error('加载链接失败:', error)
    }
  }

  const filteredLinks = links.filter(link => {
    const query = searchQuery.toLowerCase()
    const tagsStr = (link as any).tags || ''
    return (
      link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query) ||
      (link.description && link.description.toLowerCase().includes(query)) ||
      tagsStr.toLowerCase().includes(query)
    )
  })

  const handleSave = async () => {
    if (!window.electronAPI || !formData.title || !formData.url) return
    
    try {
      if (editingLink) {
        await window.electronAPI.db.query(
          "UPDATE links SET title = ?, url = ?, description = ?, tags = ?, updated_at = datetime('now') WHERE id = ?",
          [formData.title, formData.url, formData.description, formData.tags, editingLink.id]
        )
      } else {
        await window.electronAPI.db.query(
          "INSERT INTO links (id, title, url, description, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
          [uuidv4(), formData.title, formData.url, formData.description, formData.tags]
        )
      }
      
      loadLinks()
      closeModal()
    } catch (error) {
      console.error('保存链接失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query("DELETE FROM links WHERE id = ?", [id])
      loadLinks()
    } catch (error) {
      console.error('删除链接失败:', error)
    }
  }

  const openLink = (url: string) => {
    // 添加 http/https 前缀如果缺失
    let fullUrl = url
    if (url && !url.match(/^https?:\/\//i)) {
      fullUrl = 'https://' + url
    }
    window.electronAPI?.shell.openExternal(fullUrl)
  }

  const openEditModal = (link: LinkType) => {
    setEditingLink(link)
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      tags: (link as any).tags || ''
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingLink(null)
    setFormData({ title: '', url: '', description: '', tags: '' })
  }

  const parseTags = (tagsStr: string): string[] => {
    if (!tagsStr) return []
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
  }

  return (
    <div className="h-full flex flex-col p-6 bg-studio-50">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-ink-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white">
            <Link size={22} />
          </div>
          链接收藏
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          添加链接
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-studio-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索链接..."
          className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-studio-200 focus:outline-none focus:border-caramel-400 focus:ring-2 focus:ring-caramel-100"
        />
      </div>

      {/* 链接列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-studio-400">
            <div className="w-20 h-20 rounded-2xl bg-studio-100 flex items-center justify-center mb-4">
              <Link size={40} className="text-studio-300" />
            </div>
            <p>{searchQuery ? '没有找到匹配的链接' : '暂无收藏的链接'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="bg-white rounded-2xl p-5 hover:shadow-medium transition-all border border-studio-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-ink-100 text-lg mb-1">{link.title}</h3>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        openLink(link.url)
                      }}
                      className="text-sm text-caramel-400 hover:text-caramel-500 truncate block mb-2"
                    >
                      {link.url}
                    </a>
                    {link.description && (
                      <p className="text-sm text-studio-500 mb-3 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                    {link.tags && (
                      <div className="flex flex-wrap gap-2">
                        {parseTags(String((link as any).tags || '')).map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-studio-100 rounded-full text-xs text-studio-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => openLink(link.url)}
                      className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-green-500"
                      title="打开链接"
                    >
                      <ExternalLink size={18} />
                    </button>
                    <button
                      onClick={() => openEditModal(link)}
                      className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-caramel-400"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(link)}
                      className="p-2.5 rounded-xl hover:bg-studio-100 text-studio-400 hover:text-red-500"
                      title="删除"
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
                {editingLink ? '编辑链接' : '添加链接'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入链接标题"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">网址</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入链接描述（可选）"
                  rows={3}
                  className="input resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">标签</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="用逗号分隔标签，如：工作,学习,工具"
                  className="input"
                />
              </div>
              
              <button onClick={handleSave} className="w-full btn btn-primary mt-2">
                {editingLink ? '保存修改' : '添加链接'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 删除链接确认框 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除链接"
        message="删除后该链接将从收藏中移除，确定要删除吗？"
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
