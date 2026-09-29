import { useState, useEffect } from 'react'
import {
  Link,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Edit,
  X,
  Tag,
  User,
  KeyRound,
  Copy,
  Check,
  FolderPlus,
  Pencil as PencilIcon
} from 'lucide-react'
import type { Link as LinkType } from '../types'
import { v4 as uuidv4 } from 'uuid'
import ConfirmDialog from './ConfirmDialog'

// 预设分组（内置不可改）
interface PresetGroup {
  name: string
  color: string   // hex
  isPreset: true
}

// 自定义分组（用户新建）
interface CustomGroup {
  id: string
  name: string
  color: string   // hex
  position: number
  isPreset: false
}

type AnyGroup = PresetGroup | CustomGroup

// 预设分组固定 7 个
const PRESET_GROUPS: PresetGroup[] = [
  { name: '工作', color: '#3b82f6', isPreset: true },
  { name: '学习', color: '#8b5cf6', isPreset: true },
  { name: '生活', color: '#22c55e', isPreset: true },
  { name: '购物', color: '#ec4899', isPreset: true },
  { name: '娱乐', color: '#f97316', isPreset: true },
  { name: '工具', color: '#14b8a6', isPreset: true },
  { name: '其他', color: '#78716c', isPreset: true },
]

// 用户可自定义分组可选的 8 种 hex 颜色（参考 ProjectManager）
const GROUP_COLOR_OPTIONS = [
  '#0ea5e9',  // sky
  '#22c55e',  // green
  '#f59e0b',  // amber
  '#ef4444',  // red
  '#8b5cf6',  // violet
  '#ec4899',  // pink
  '#14b8a6',  // teal
  '#f97316',  // orange
]

// 把 hex 颜色按亮度计算合适的文字颜色（深色背景用白字，浅色背景用黑字）
function textColorForBg(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#ffffff'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // 相对亮度 (WCAG)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1c1917' : '#ffffff'
}

// 兼容旧数据：颜色可能是名字（rose/sky/...）或 hex 或预设分组 name
function resolveColor(color: string | null | undefined, customGroups?: CustomGroup[]): string {
  if (!color) return PRESET_GROUPS[6].color
  // 是 hex 直接返回
  if (color.startsWith('#')) return color
  // 兼容：可能是预设名字
  const preset = PRESET_GROUPS.find(p => p.name === color)
  if (preset) return preset.color
  // 兼容：可能是新色彩 value（旧 GROUP_COLOR_OPTIONS 里的 value）— 已删，先按 hex 处理
  if (customGroups) {
    const custom = customGroups.find(g => g.color === color)
    if (custom) return custom.color
  }
  return PRESET_GROUPS[6].color
}

export default function LinkManager({ refreshKey }: { refreshKey?: number }) {
  const [links, setLinks] = useState<LinkType[]>([])
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LinkType | null>(null)
  const [showGroupManager, setShowGroupManager] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLOR_OPTIONS[0])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<CustomGroup | null>(null)
  const [createError, setCreateError] = useState('')
  const [renameError, setRenameError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    tags: '',
    category: '',
    account: '',
    password_hint: ''
  })

  useEffect(() => {
    loadLinks()
    loadCustomGroups()

    // 监听标签页显示状态，数据变化时刷新
    const handleVisibility = () => {
      if (!document.hidden) {
        loadLinks()
        loadCustomGroups()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refreshKey])

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

  const loadCustomGroups = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM link_groups WHERE is_preset = 0 ORDER BY position ASC, created_at ASC"
      )
      if (result.data) {
        setCustomGroups(result.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          color: r.color || GROUP_COLOR_OPTIONS[0],
          position: r.position || 0,
          isPreset: false,
        })))
      }
    } catch (error) {
      console.error('加载自定义分组失败:', error)
    }
  }

  // 给 link.category 字段返回 { bg, fg } 配色对象
  const getGroupColors = (categoryName: string): { bg: string; fg: string } => {
    const preset = PRESET_GROUPS.find(p => p.name === categoryName)
    if (preset) return { bg: preset.color, fg: textColorForBg(preset.color) }
    const custom = customGroups.find(g => g.name === categoryName)
    if (custom) return { bg: custom.color, fg: textColorForBg(custom.color) }
    return { bg: PRESET_GROUPS[6].color, fg: textColorForBg(PRESET_GROUPS[6].color) }
  }

  // 合并后的全部分组（预设 + 自定义）
  const allGroups: AnyGroup[] = [
    ...PRESET_GROUPS,
    ...customGroups,
  ]

  const filteredLinks = links.filter(link => {
    const query = searchQuery.toLowerCase()
    const tagsStr = (link as any).tags || ''
    const accountStr = (link as any).account || ''
    const categoryStr = (link as any).category || ''
    const matchSearch = (
      link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query) ||
      (link.description && link.description.toLowerCase().includes(query)) ||
      tagsStr.toLowerCase().includes(query) ||
      accountStr.toLowerCase().includes(query)
    )
    const matchCategory = !categoryFilter || categoryStr === categoryFilter
    return matchSearch && matchCategory
  })

  // 统计各分组链接数
  const categoryCounts = links.reduce<Record<string, number>>((acc, link) => {
    const c = (link as any).category || ''
    if (c) acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})

  // ===== 分组管理 CRUD =====

  const handleCreateGroup = async () => {
    if (!window.electronAPI || !newGroupName.trim()) return
    const name = newGroupName.trim()
    // 判重：不能与预设重名，也不能与已存在的自定义重名
    const presetNames = PRESET_GROUPS.map(p => p.name)
    const customNames = customGroups.map(g => g.name)
    if (presetNames.includes(name)) {
      setCreateError(`"${name}" 是预设分组名，请换一个其他名字`)
      return
    }
    if (customNames.includes(name)) {
      setCreateError(`"${name}" 已经存在，请换一个其他名字`)
      return
    }
    const id = uuidv4()
    const maxPos = customGroups.reduce((m, g) => Math.max(m, g.position), -1)
    try {
      await window.electronAPI.db.query(
        "INSERT INTO link_groups (id, name, color, position, is_preset, created_at) VALUES (?, ?, ?, ?, 0, datetime('now'))",
        [id, name, newGroupColor, maxPos + 1]
      )
      setNewGroupName('')
      setCreateError('')
      loadCustomGroups()
    } catch (error: any) {
      console.error('创建分组失败:', error)
      if (String(error?.message || '').includes('UNIQUE')) {
        setCreateError(`"${name}" 已经存在，请换一个其他名字`)
      } else {
        setCreateError('创建失败：' + (error?.message || String(error)))
      }
    }
  }

  const handleRenameGroup = async (id: string) => {
    if (!window.electronAPI || !editingGroupName.trim()) return
    const name = editingGroupName.trim()
    // 判重
    const presetNames = PRESET_GROUPS.map(p => p.name)
    const others = customGroups.filter(g => g.id !== id).map(g => g.name)
    if (presetNames.includes(name) || others.includes(name)) {
      setRenameError(`"${name}" 与其他分组重名，请换一个其他名字`)
      return
    }
    try {
      await window.electronAPI.db.query(
        "UPDATE link_groups SET name = ? WHERE id = ?",
        [name, id]
      )
      // 把链接里的旧 category 名字同步更新
      await window.electronAPI.db.query(
        "UPDATE links SET category = ?, updated_at = datetime('now') WHERE category = ?",
        [name, customGroups.find(g => g.id === id)?.name || '']
      )
      setEditingGroupId(null)
      setEditingGroupName('')
      setRenameError('')
      loadCustomGroups()
      loadLinks()
    } catch (error: any) {
      console.error('重命名分组失败:', error)
      if (String(error?.message || '').includes('UNIQUE')) {
        setRenameError(`"${name}" 与其他分组重名`)
      } else {
        setRenameError('重命名失败：' + (error?.message || String(error)))
      }
    }
  }

  const handleChangeGroupColor = async (id: string, color: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query(
        "UPDATE link_groups SET color = ? WHERE id = ?",
        [color, id]
      )
      loadCustomGroups()
    } catch (error) {
      console.error('修改颜色失败:', error)
    }
  }

  const handleDeleteGroup = async () => {
    if (!window.electronAPI || !deleteGroupTarget) return
    const oldName = deleteGroupTarget.name
    try {
      // 把归在该分组下的 link.category 重命名为 "未分组"（避免悬空字符串）
      await window.electronAPI.db.query(
        "UPDATE links SET category = ?, updated_at = datetime('now') WHERE category = ?",
        ['未分组', oldName]
      )
      // 再删分组
      await window.electronAPI.db.query("DELETE FROM link_groups WHERE id = ?", [deleteGroupTarget.id])
      setDeleteGroupTarget(null)
      loadCustomGroups()
      loadLinks()
      // 如果当前正在按这个分组筛选，清掉筛选
      if (categoryFilter === oldName) setCategoryFilter('')
    } catch (error) {
      console.error('删除分组失败:', error)
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI || !formData.title || !formData.url) return
    
    try {
      if (editingLink) {
        await window.electronAPI.db.query(
          "UPDATE links SET title = ?, url = ?, description = ?, tags = ?, category = ?, account = ?, password_hint = ?, updated_at = datetime('now') WHERE id = ?",
          [formData.title, formData.url, formData.description, formData.tags, formData.category, formData.account, formData.password_hint, editingLink.id]
        )
      } else {
        await window.electronAPI.db.query(
          "INSERT INTO links (id, title, url, description, tags, category, account, password_hint, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
          [uuidv4(), formData.title, formData.url, formData.description, formData.tags, formData.category, formData.account, formData.password_hint]
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
      tags: (link as any).tags || '',
      category: (link as any).category || '',
      account: (link as any).account || '',
      password_hint: (link as any).password_hint || ''
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingLink(null)
    setFormData({ title: '', url: '', description: '', tags: '', category: '', account: '', password_hint: '' })
  }

  const parseTags = (tagsStr: string): string[] => {
    if (!tagsStr) return []
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
  }

  // 复制文本到剪贴板（带状态反馈）
  const [copiedText, setCopiedText] = useState('')
  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 1500)
    } catch (error) {
      console.error('复制失败:', error)
    }
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
      <div className="relative mb-4">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-studio-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索链接（标题、网址、账号、标签）..."
          className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-studio-200 focus:outline-none focus:border-caramel-400 focus:ring-2 focus:ring-caramel-100"
        />
      </div>

      {/* 分组筛选栏 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
            categoryFilter === ''
              ? 'bg-caramel-400 text-white'
              : 'bg-white border border-studio-200 text-studio-500 hover:border-caramel-300'
          }`}
        >
          全部<span className="ml-1 opacity-70">{links.length}</span>
        </button>
        {allGroups.filter(g => categoryCounts[g.name]).map((g) => {
          const active = categoryFilter === g.name
          const bg = g.color
          const fg = textColorForBg(bg)
          return (
            <button
              key={g.isPreset ? `preset-${g.name}` : g.id}
              onClick={() => setCategoryFilter(active ? '' : g.name)}
              className={`px-3.5 py-1.5 rounded-full text-sm transition-colors border ${
                active
                  ? 'ring-2 ring-caramel-300'
                  : 'border-studio-200 hover:border-caramel-300'
              }`}
              style={active
                ? { backgroundColor: bg, color: fg, borderColor: bg }
                : { backgroundColor: 'white', color: fg === '#ffffff' ? '#78716c' : fg }
              }
            >
              {g.name}<span className="ml-1 opacity-70">{categoryCounts[g.name]}</span>
            </button>
          )
        })}
        <button
          onClick={() => setShowGroupManager(true)}
          className="px-3 py-1.5 rounded-full text-sm border border-dashed border-studio-300 text-studio-500 hover:border-caramel-400 hover:text-caramel-500 flex items-center gap-1"
          title="管理分组"
        >
          <FolderPlus size={14} />
          管理分组
        </button>
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-ink-100 text-lg truncate">{link.title}</h3>
                      {(link as any).category && (
                          (() => {
                            const { bg, fg } = getGroupColors((link as any).category)
                            return (
                              <span
                                className="px-2 py-0.5 rounded-lg text-xs flex-shrink-0"
                                style={{ backgroundColor: bg, color: fg }}
                              >
                                {(link as any).category}
                              </span>
                            )
                          })()
                      )}
                    </div>
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
                    {/* 账号与密码提示 */}
                    {((link as any).account || (link as any).password_hint) && (
                      <div className="flex items-center gap-4 mb-3 text-xs text-studio-500">
                        {(link as any).account && (
                          <span className="flex items-center gap-1.5">
                            <User size={13} className="text-studio-400" />
                            <span className="truncate max-w-[160px]">{String((link as any).account)}</span>
                            <button
                              onClick={() => copyText(String((link as any).account), 'account')}
                              className="p-1 rounded-md hover:bg-studio-100 text-studio-400 hover:text-caramel-400 transition-colors"
                              title="复制账号"
                            >
                              {copiedText === 'account'
                                ? <Check size={12} className="text-green-500" />
                                : <Copy size={12} />}
                            </button>
                          </span>
                        )}
                        {(link as any).password_hint && (
                          <span className="flex items-center gap-1.5" title="密码提示（仅提示，不存明文密码）">
                            <KeyRound size={13} className="text-studio-400" />
                            {String((link as any).password_hint)}
                          </span>
                        )}
                      </div>
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
                  rows={4}
                  className="input resize-y min-h-[100px] max-h-56"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">
                  分组
                  <span className="text-xs text-studio-400 ml-2 font-normal">
                    （互斥单选，标签请用下方"标签"字段）
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: '' })}
                    className={`px-3.5 py-1.5 rounded-full text-sm transition-colors border ${
                      formData.category === ''
                        ? 'bg-caramel-400 text-white border-caramel-400'
                        : 'bg-white border-studio-200 text-studio-500 hover:border-caramel-300'
                    }`}
                  >
                    无
                  </button>
                  {allGroups.map((g) => {
                    const active = formData.category === g.name
                    const bg = g.color
                    const fg = textColorForBg(bg)
                    return (
                      <button
                        key={g.isPreset ? `preset-${g.name}` : g.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: g.name })}
                        className={`px-3.5 py-1.5 rounded-full text-sm transition-colors border ${
                          active ? 'ring-2 ring-caramel-300' : 'border-studio-200 hover:border-caramel-300'
                        }`}
                        style={active
                          ? { backgroundColor: bg, color: fg, borderColor: bg }
                          : { backgroundColor: 'white', color: fg === '#ffffff' ? '#78716c' : fg }
                        }
                      >
                        {g.name}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setShowGroupManager(true)}
                    className="px-3 py-1.5 rounded-full text-sm border border-dashed border-studio-300 text-studio-500 hover:border-caramel-400 hover:text-caramel-500 flex items-center gap-1"
                    title="管理分组（新建 / 重命名 / 删除 / 改色）"
                  >
                    <FolderPlus size={14} />
                    管理分组
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-studio-500 mb-2">账号（可选）</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-400" />
                    <input
                      type="text"
                      value={formData.account}
                      onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                      placeholder="登录账号"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-studio-500 mb-2">密码提示（可选）</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-400" />
                    <input
                      type="text"
                      value={formData.password_hint}
                      onChange={(e) => setFormData({ ...formData, password_hint: e.target.value })}
                      placeholder="如：姓名拼音+生日"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
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

      {/* 分组管理弹窗 */}
      {showGroupManager && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowGroupManager(false)
            setCreateError('')
            setRenameError('')
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-large max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-studio-200">
              <h3 className="font-display text-lg font-semibold text-ink-100">管理分组</h3>
              <button
                onClick={() => setShowGroupManager(false)}
                className="text-studio-400 hover:text-studio-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* 新建分组 */}
            <div className="p-6 border-b border-studio-200 bg-studio-50">
              <h4 className="text-sm font-medium text-studio-500 mb-3">新建分组</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => { setNewGroupName(e.target.value); setCreateError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup() }}
                  placeholder="分组名（如：AI 工具）"
                  className="input w-full"
                  maxLength={20}
                />
                <div>
                  <p className="text-xs text-studio-400 mb-2">选颜色</p>
                  <div className="flex gap-2 flex-wrap">
                    {GROUP_COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewGroupColor(color)}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          newGroupColor === color
                            ? 'ring-2 ring-offset-2 ring-caramel-400 scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                {createError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {createError}
                  </p>
                )}
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="relative w-full p-4 rounded-xl bg-gradient-to-br from-caramel-400 to-caramel-500 text-white hover:from-caramel-500 hover:to-caramel-600 disabled:opacity-40 disabled:hover:from-caramel-400 disabled:hover:to-caramel-500 transition-all shadow-soft hover:shadow-medium disabled:cursor-not-allowed flex items-center gap-3"
                >
                  {/* + 号在卡片左上角突出位置 */}
                  <span
                    className="absolute top-1.5 left-2 text-xl font-light opacity-80"
                    aria-hidden
                  >+</span>
                  <div className="flex items-center gap-2 flex-1 pl-3">
                    <div
                      className="w-6 h-6 rounded-md border-2 border-white/60 flex-shrink-0"
                      style={{ backgroundColor: newGroupColor }}
                    />
                    <span className="font-medium">新建分组</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 预设分组（只读） */}
            <div className="p-6 border-b border-studio-200">
              <h4 className="text-sm font-medium text-studio-500 mb-3">
                预设分组 <span className="text-xs text-studio-400 font-normal">（内置，不可改）</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {PRESET_GROUPS.map(p => (
                  <span
                    key={p.name}
                    className="px-3 py-1 rounded-full text-xs border"
                    style={{
                      backgroundColor: p.color,
                      color: textColorForBg(p.color),
                      borderColor: p.color,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* 自定义分组（可编辑/删除） */}
            <div className="p-6">
              <h4 className="text-sm font-medium text-studio-500 mb-3">
                自定义分组
                {customGroups.length === 0 && (
                  <span className="text-xs text-studio-400 font-normal ml-2">（暂无，在上方新建）</span>
                )}
              </h4>
              {customGroups.length > 0 && (
                <div className="space-y-2">
                  {customGroups.map(g => (
                    <div key={g.id} className="p-2 rounded-lg hover:bg-studio-50">
                      <div className="flex items-center gap-2">
                      {editingGroupId === g.id ? (
                        <>
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => { setEditingGroupName(e.target.value); setRenameError('') }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameGroup(g.id)
                              if (e.key === 'Escape') { setEditingGroupId(null); setEditingGroupName(''); setRenameError('') }
                            }}
                            className="input flex-1"
                            maxLength={20}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameGroup(g.id)}
                            className="btn btn-primary text-sm"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => { setEditingGroupId(null); setEditingGroupName(''); setRenameError('') }}
                            className="btn btn-ghost text-sm"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            className="px-3 py-1 rounded-full text-xs border"
                            style={{
                              backgroundColor: g.color,
                              color: textColorForBg(g.color),
                              borderColor: g.color,
                            }}
                          >
                            {g.name}
                          </span>
                          <span className="text-xs text-studio-400">
                            {categoryCounts[g.name] || 0} 个链接
                          </span>
                          <div className="flex-1" />
                          <div className="flex gap-1">
                            {GROUP_COLOR_OPTIONS.map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleChangeGroupColor(g.id, color)}
                                className={`w-5 h-5 rounded transition-transform ${
                                  g.color === color
                                    ? 'ring-2 ring-offset-1 ring-caramel-400 scale-110'
                                    : 'hover:scale-110'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => { setEditingGroupId(g.id); setEditingGroupName(g.name) }}
                            className="text-studio-400 hover:text-caramel-500 p-1"
                            title="重命名"
                          >
                            <PencilIcon size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteGroupTarget(g)}
                            className="text-studio-400 hover:text-red-500 p-1"
                            title="删除分组"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      </div>
                      {editingGroupId === g.id && renameError && (
                        <p className="mt-1 ml-1 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                          {renameError}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 删除自定义分组 confirm */}
      <ConfirmDialog
        isOpen={!!deleteGroupTarget}
        title="删除分组"
        message={`删除"${deleteGroupTarget?.name}"分组后，归在这个分组下的链接保留原分组名（可手动改），确定要删除吗？`}
        itemName={deleteGroupTarget?.name}
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />
    </div>
  )
}
