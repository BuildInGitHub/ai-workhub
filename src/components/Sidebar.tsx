import { useState, useRef, useEffect, type ReactNode } from 'react'
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Send, 
  Settings,
  Loader2,
  X,
  Sparkles,
  Zap,
  Folder,
  Link,
  CheckSquare,
  Calendar,
  Search,
  Home,
  Brain,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  FileText,
  Hash,
  Lightbulb,
  BarChart3,
  ListChecks,
  Link2,
  Download,
  Upload,
  Image,
  Video,
  Music,
  Archive,
  AppWindow,
  Store,
  Server,
  Terminal,
  Plus,
  Power,
  Trash2,
  PlayCircle,
  StopCircle,
  Eye
} from 'lucide-react'

// 图标映射表
const iconMap: Record<string, ReactNode> = {
  '[Brain]': <Brain size={16} className="inline text-purple-500" />,
  '[ListChecks]': <ListChecks size={16} className="inline text-blue-500" />,
  '[Sparkles]': <Sparkles size={16} className="inline text-caramel-400" />,
  '[CheckCircle]': <CheckCircle size={16} className="inline text-green-500" />,
  '[AlertCircle]': <AlertCircle size={16} className="inline text-red-500" />,
  '[FolderOpen]': <FolderOpen size={16} className="inline text-blue-400" />,
  '[Folder]': <Folder size={16} className="inline text-yellow-500" />,
  '[FileText]': <FileText size={16} className="inline text-gray-500" />,
  '[Hash]': <Hash size={16} className="inline text-gray-400" />,
  '[Lightbulb]': <Lightbulb size={16} className="inline text-yellow-400" />,
  '[BarChart3]': <BarChart3 size={16} className="inline text-indigo-500" />,
  '[Link2]': <Link2 size={16} className="inline text-blue-400" />,
  '[Download]': <Download size={16} className="inline text-green-500" />,
  '[Upload]': <Upload size={16} className="inline text-orange-500" />,
  '[Image]': <Image size={16} className="inline text-pink-400" />,
  '[Video]': <Video size={16} className="inline text-red-400" />,
  '[Music]': <Music size={16} className="inline text-purple-400" />,
  '[Archive]': <Archive size={16} className="inline text-gray-500" />,
  '[AppWindow]': <AppWindow size={16} className="inline text-blue-500" />,
  '[Zap]': <Zap size={16} className="inline text-yellow-500" />,
  '[Star]': <Sparkles size={16} className="inline text-yellow-400" />,
}

// 解析消息内容，将 [IconName] 转换为图标组件
function parseMessageContent(content: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\[(Brain|ListChecks|Sparkles|CheckCircle|AlertCircle|FolderOpen|Folder|FileText|Hash|Lightbulb|BarChart3|Link2|Download|Upload|Image|Video|Music|Archive|AppWindow|Zap|Star)\]/g
  
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(content)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    
    const iconKey = match[0]
    const icon = iconMap[iconKey]
    if (icon) {
      parts.push(icon)
    } else {
      parts.push(match[0])
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // 添加剩余文本
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  
  return parts.length > 0 ? parts : [content]
}

// 生成折叠时的摘要：去掉图标标记，取第一行前 40 字
function getMessageSummary(content: string): string {
  const clean = content.replace(/\[[A-Za-z0-9]+\]/g, '').replace(/\s+/g, ' ').trim()
  const firstLine = clean.split('\n').find(l => l.trim()) || ''
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine
}
import type { ChatMessage, Tab } from '../types'
import MarketplaceModal from './MarketplaceModal'

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  apiKey: string
  onSaveApiKey: (key: string) => void
  apiKeySet: boolean
  onNavigate: (type: Tab['type'], title: string) => void
  onShowSessions?: () => void
  isSessionPanelOpen?: boolean
  engineVersion?: 'v1' | 'v2'
  onChangeEngine?: (v: 'v1' | 'v2') => void
}

// v2 抽屉小工具：折叠按钮 + 标题 + children
function ExtensionSection({ icon, title, open, onToggle, children }: {
  icon: ReactNode
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="pt-3 border-t border-studio-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-sm font-medium text-studio-500 hover:text-ink-100"
      >
        <span className="flex items-center gap-2">
          <span className="text-caramel-500">{icon}</span>
          {title}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="mt-2 pl-1">{children}</div>}
    </div>
  )
}

// 设置面板左栏分类导航
function NavTab({ id, icon, label, active, onClick }: {
  id: 'ai' | 'extensions' | 'data'
  icon: ReactNode
  label: string
  active: boolean
  onClick: (id: 'ai' | 'extensions' | 'data') => void
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
        active
          ? 'bg-caramel-50 text-caramel-700 font-medium'
          : 'text-studio-500 hover:bg-studio-100 hover:text-ink-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function Sidebar({
  isExpanded,
  onToggle,
  messages,
  onSendMessage,
  isLoading,
  apiKey,
  onSaveApiKey,
  apiKeySet,
  onNavigate,
  onShowSessions,
  isSessionPanelOpen = false,
  engineVersion = 'v1',
  onChangeEngine
}: SidebarProps) {
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [tempApiKey, setTempApiKey] = useState(apiKey)

  // v2 扩展抽屉开关
  const [activeTab, setActiveTab] = useState<'ai' | 'extensions' | 'data'>('ai')
  const [mcpOpen, setMcpOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [cliOpen, setCliOpen] = useState(false)
  const [marketType, setMarketType] = useState<null | 'mcp' | 'skill' | 'cli'>(null)
  const [mcpServers, setMcpServers] = useState<any[]>([])
  const [startingIds, setStartingIds] = useState<Set<string>>(new Set())
  const [skills, setSkills] = useState<any[]>([])
  const [cliRows, setCliRows] = useState<any[]>([])
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<Record<string, string>>({})
  const [backupInfo, setBackupInfo] = useState<string>('')
  // AI 消息折叠状态：id 在集合中 = 折叠（默认折叠）
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    const s = new Set<string>()
    messages.forEach(m => { if (m.role === 'assistant') s.add(m.id) })
    return s
  })
  // 记录已处理过的消息 id，新 AI 消息到达时自动折叠（不干扰用户手动展开的）
  const seenMessageIds = useRef<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let changed = false
    setCollapsedIds(prev => {
      const next = new Set(prev)
      messages.forEach(m => {
        if (m.role === 'assistant' && !seenMessageIds.current.has(m.id)) {
          next.add(m.id) // 新 AI 消息默认折叠
          seenMessageIds.current.add(m.id)
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSaveSettings = () => {
    onSaveApiKey(tempApiKey)
    setShowSettings(false)
  }

  // 切换 AI 引擎：写到 settings 表（持久化）并实时回调 App
  const handleChangeEngine = async (v: 'v1' | 'v2') => {
    onChangeEngine?.(v)
    try {
      await window.electronAPI?.db.query(
        "INSERT OR REPLACE INTO settings (id, key, value, created_at) VALUES (?, ?, ?, datetime('now'))",
        ['engine_version', 'engine_version', v]
      )
    } catch (e) {
      console.error('保存引擎设置失败:', e)
    }
  }

  // ============ v2 扩展：MCP / Skills / CLI handlers ============
  const refreshMcp = async () => {
    const r = await window.electronAPI?.mcp?.listServers?.()
    setMcpServers(r?.data || [])
  }
  const refreshSkills = async () => {
    const r = await window.electronAPI?.skill?.list?.()
    setSkills(r || [])
  }
  const refreshCli = async () => {
    const r = await window.electronAPI?.cli?.list?.()
    setCliRows(r?.data || [])
  }
  const mcpAction = async (id: string, act: 'start' | 'stop' | 'uninstall', _row?: any) => {
    if (act === 'start') {
      // 标记"启动中"+阶段文案（用 last_error 字段当下进度显示，避免再加新字段）
      setStartingIds(s => new Set(s).add(id))
      const step = (msg: string) => setMcpServers(prev => prev.map(x => x.id === id ? { ...x, last_error: msg } : x))
      step('⏳ 检查前置依赖…')
      setTimeout(() => step('⏳ 首次启动约 5-15 秒…'), 1500)
      setTimeout(() => step('⏳ 仍在连接 MCP server…'), 6000)
      try {
        const r = await window.electronAPI?.mcp?.start?.(id)
        if (!r?.ok) {
          step(r?.error || '启动失败')
        } else {
          step('')
        }
      } catch (e: any) {
        step(`✗ ${e.message}`)
      }
      setStartingIds(s => { const n = new Set(s); n.delete(id); return n })
    } else if (act === 'stop') {
      await window.electronAPI?.mcp?.stop?.(id)
    } else if (act === 'uninstall') {
      await window.electronAPI?.mcp?.uninstall?.(id)
    }
    setTimeout(refreshMcp, 300)
  }
  const toggleSkillView = async (s: any) => {
    if (expandedSkill === s.name) {
      setExpandedSkill(null)
      return
    }
    setExpandedSkill(s.name)
    if (!skillContent[s.name]) {
      const r = await window.electronAPI?.skill?.readContent?.(s.name)
      if (r?.content) setSkillContent(prev => ({ ...prev, [s.name]: r.content! }))
    }
  }
  const removeSkill = async (name: string) => {
    await window.electronAPI?.skill?.remove?.(name)
    refreshSkills()
  }
  const cliAction = async (id: string, act: 'detect' | 'uninstall' | 'remove', row?: any) => {
    if (act === 'detect' && row?.bin) {
      const r = await window.electronAPI?.cli?.detect?.(row.bin)
      setBackupInfo(r?.installed ? `${row.bin}: 已装 (${r.version || r.path})` : `${row.bin}: 未找到`)
      setTimeout(() => setBackupInfo(''), 4000)
    } else if (act === 'uninstall') {
      await window.electronAPI?.cli?.uninstall?.(row)
    } else if (act === 'remove') {
      await window.electronAPI?.cli?.remove?.(id)
    }
    setTimeout(refreshCli, 300)
  }

  // 数据管理操作
  const handleBackup = async () => {
    const result = await window.electronAPI?.db.backupNow?.()
    setBackupInfo(result?.message || '备份失败')
    setTimeout(() => setBackupInfo(''), 4000)
  }

  const handleExport = async () => {
    const result = await window.electronAPI?.db.exportData?.()
    setBackupInfo(result?.message || '导出失败')
    setTimeout(() => setBackupInfo(''), 4000)
  }

  const handleImport = async () => {
    if (!confirm('导入将覆盖当前全部数据（导入前会自动备份现有数据）。确定继续吗？')) return
    const result = await window.electronAPI?.db.importData?.()
    setBackupInfo(result?.message || '导入失败')
    if (result?.success) {
      setTimeout(() => window.location.reload(), 800)
    } else {
      setTimeout(() => setBackupInfo(''), 4000)
    }
  }

  // 快捷提示
  const quickPrompts = [
    "帮我整理桌面文件",
    "查找最近的文档",
    "总结这个项目",
    "创建本周任务"
  ]

  return (
    <>
      {/* 侧边栏 */}
      <div 
        className={`flex flex-col bg-white border-r border-studio-300 transition-all duration-300 shadow-soft ${
          isExpanded ? 'w-96' : 'w-16'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-studio-200">
          {isExpanded && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-caramel-400 to-caramel-500 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-ink-100">AI 伙伴</h2>
                {/* <p className="text-xs text-studio-500">智能办公伙伴</p> */}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            {isExpanded && onShowSessions && (
              <button 
                onClick={onShowSessions}
                className={`p-2 rounded-xl transition-colors ${
                  isSessionPanelOpen 
                    ? 'bg-caramel-100 text-caramel-600' 
                    : 'hover:bg-studio-200 text-studio-500'
                }`}
                title={isSessionPanelOpen ? '隐藏会话列表' : '显示会话列表'}
              >
                <MessageSquare size={20} />
              </button>
            )}
            <button 
              onClick={onToggle}
              className="p-2 rounded-xl hover:bg-studio-200 transition-colors text-studio-500"
            >
              {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>

        {/* 快速导航按钮 */}
        {isExpanded && (
          <div className="p-3 border-b border-studio-200">
            <p className="text-xs font-medium text-studio-500 mb-2 px-1">快速访问</p>
            <div className="grid grid-cols-3 gap-1">
              <button 
                onClick={() => onNavigate('files', '文件管理')}
                className="p-2.5 text-xs rounded-xl hover:bg-studio-100 transition-colors flex flex-col items-center gap-1.5"
              >
                <Folder size={18} className="text-studio-500" />
                <span className="text-studio-500">文件</span>
              </button>
              <button 
                onClick={() => onNavigate('links', '链接收藏')}
                className="p-2.5 text-xs rounded-xl hover:bg-studio-100 transition-colors flex flex-col items-center gap-1.5"
              >
                <Link size={18} className="text-studio-500" />
                <span className="text-studio-500">链接</span>
              </button>
              <button 
                onClick={() => onNavigate('tasks', '任务管理')}
                className="p-2.5 text-xs rounded-xl hover:bg-studio-100 transition-colors flex flex-col items-center gap-1.5"
              >
                <CheckSquare size={18} className="text-studio-500" />
                <span className="text-studio-500">任务</span>
              </button>
            </div>
          </div>
        )}

        {isExpanded ? (
          <>
            {/* 聊天消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-caramel-50 to-caramel-100 flex items-center justify-center">
                    <Zap size={32} className="text-caramel-400" />
                  </div>
                  <h3 className="font-display text-lg text-ink-100 mb-1">你好，我是 AI 伙伴</h3>
                  <p className="text-sm text-studio-500 mb-4">可以帮你管理文件、链接和任务</p>
                  
                  {/* 快捷提示 */}
                  <div className="space-y-2">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => onSendMessage(prompt)}
                        className="block w-full text-left px-3 py-2 text-sm text-studio-500 bg-studio-100 rounded-lg hover:bg-caramel-50 hover:text-caramel-600 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] p-4 rounded-2xl bg-gradient-to-br from-caramel-400 to-caramel-500 text-white">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    // AI 消息：可折叠/展开，默认折叠
                    <div className="max-w-[85%] min-w-0 bg-white border border-studio-300 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => {
                          setCollapsedIds(prev => {
                            const next = new Set(prev)
                            if (next.has(msg.id)) next.delete(msg.id)
                            else next.add(msg.id)
                            return next
                          })
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-studio-50 transition-colors text-left"
                        title={collapsedIds.has(msg.id) ? '展开' : '折叠'}
                      >
                        <Sparkles size={14} className="text-caramel-400 flex-shrink-0" />
                        <span className="flex-1 min-w-0 text-xs text-studio-500 truncate">
                          {collapsedIds.has(msg.id)
                            ? getMessageSummary(msg.content)
                            : 'AI 回复'}
                        </span>
                        {collapsedIds.has(msg.id)
                          ? <ChevronDown size={14} className="text-studio-400 flex-shrink-0" />
                          : <ChevronUp size={14} className="text-studio-400 flex-shrink-0" />}
                      </button>
                      {!collapsedIds.has(msg.id) && (
                        <div className="px-4 pb-3 text-ink-100 overflow-hidden">
                          <p className="text-sm whitespace-pre-wrap break-all">{parseMessageContent(msg.content)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-studio-300 p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-caramel-400" />
                      <span className="text-sm text-studio-500">AI正在思考中...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 设置按钮 */}
            <button 
              onClick={() => {
                setShowSettings(true)
                setTempApiKey(apiKey)
              }}
              className="mx-4 mb-2 p-2.5 rounded-xl hover:bg-studio-100 transition-colors flex items-center gap-2 text-studio-500"
            >
              <Settings size={18} />
              <span className="text-sm">设置</span>
            </button>

            {/* 输入区域 */}
            <div className="p-4 border-t border-studio-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="发送消息..."
                  className="input"
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="btn btn-primary p-3"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // 收起状态
          <div className="flex-1 flex flex-col items-center pt-4 gap-3">
            <button 
              onClick={onToggle}
              className="p-3 rounded-xl hover:bg-studio-100 transition-colors"
              title="展开AI伙伴"
            >
              <MessageSquare size={24} className="text-caramel-400" />
            </button>
          </div>
        )}
      </div>

      {/* 设置弹窗（两栏布局：左侧分类 / 右侧内容） */}
      {showSettings && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false) }}>
          <div className="bg-white rounded-2xl w-[760px] max-w-[95vw] h-[600px] max-h-[85vh] shadow-elevated animate-slideIn flex flex-col">
            {/* 顶栏：标题 + 关闭 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-studio-100">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Settings size={18} className="text-caramel-500" />设置
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            {/* 主体：左分类导航 + 右内容 */}
            <div className="flex-1 flex min-h-0">
              {/* 左栏 */}
              <nav className="w-44 border-r border-studio-100 p-3 space-y-1 flex-shrink-0">
                <NavTab id="ai" icon={<Brain size={16} />} label="AI" active={activeTab === 'ai'} onClick={setActiveTab} />
                <NavTab id="extensions" icon={<Store size={16} />} label="扩展" active={activeTab === 'extensions'} onClick={setActiveTab} />
                <NavTab id="data" icon={<Hash size={16} />} label="数据" active={activeTab === 'data'} onClick={setActiveTab} />
              </nav>
              {/* 右栏内容 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {activeTab === 'ai' && (<>
                  {/* DeepSeek API Key */}
                  <div>
                    <label className="block text-sm font-medium text-studio-500 mb-2">DeepSeek API Key</label>
                    <input
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="sk-xxxx..."
                      className="input"
                    />
                    <p className="text-xs text-studio-500 mt-2">请从 DeepSeek 官网获取API Key</p>
                  </div>
                  {apiKeySet && <p className="text-sm text-green-600 flex items-center gap-1">✓ API Key 已配置</p>}

                  {/* AI 引擎选择 */}
                  <div>
                    <label className="block text-sm font-medium text-studio-500 mb-2">AI 引擎</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleChangeEngine('v1')}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors ${engineVersion === 'v1' ? 'bg-caramel-400 text-white' : 'bg-studio-100 text-studio-500 hover:text-ink-100'}`}
                      >v1 自研（稳定）</button>
                      <button
                        onClick={() => handleChangeEngine('v2')}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors ${engineVersion === 'v2' ? 'bg-caramel-400 text-white' : 'bg-studio-100 text-studio-500 hover:text-ink-100'}`}
                        title="基于 @earendil-works/pi-agent-core（Pi SDK v0.83.0）"
                      >v2 Pi SDK（实验）</button>
                    </div>
                    <p className="text-xs text-studio-400 mt-2 leading-relaxed">
                      v1 自研引擎（默认）— 已稳定的规划/执行/校验/重规划循环
                      <br />v2 基于 Pi SDK 内核 — 新架构，可能存在不稳定
                    </p>
                  </div>
                  <button onClick={handleSaveSettings} className="w-full btn btn-primary">保存设置</button>
                </>)}

                {activeTab === 'extensions' && (<>
                  {/* ========== v2 扩展抽屉 ========== */}
                  <ExtensionSection
                    icon={<Server size={14} />}
                    title="MCP Servers"
                    open={mcpOpen}
                    onToggle={() => {
                      setMcpOpen(o => !o)
                      if (!mcpOpen && mcpServers.length === 0) refreshMcp()
                    }}
                  >
                    {mcpServers.length === 0 ? (
                      <p className="text-xs text-studio-500 py-2">本地暂无 MCP server。点击"打开市场"一键安装。</p>
                    ) : mcpServers.map(s => (
                      <div key={s.id} className="border border-studio-200 rounded-lg p-2.5 mb-2 last:mb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-studio-500 truncate">{s.command} {(JSON.parse(s.args || '[]')).join(' ')}</p>
                            {s.last_error && (
                              <p className={`text-xs mt-1 line-clamp-2 ${s.last_error.startsWith('⏳') ? 'text-caramel-600' : s.last_error.startsWith('✗') ? 'text-red-600' : 'text-studio-500'}`}>
                                {s.last_error}
                              </p>
                            )}
                          </div>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${s.status === 'enabled' ? 'bg-green-100 text-green-700' : s.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-studio-100 text-studio-600'}`}>
                            {s.status === 'enabled' ? '运行中' : s.status === 'error' ? '错误' : '已停'}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {s.status === 'enabled' ? (
                            <button onClick={() => mcpAction(s.id, 'stop')} disabled={startingIds.has(s.id)} className="flex-1 text-xs py-1 rounded bg-studio-100 hover:bg-studio-200 disabled:opacity-60 flex items-center justify-center gap-1"><StopCircle size={12} />停止</button>
                          ) : (
                            <button onClick={() => mcpAction(s.id, 'start')} disabled={startingIds.has(s.id)} className="flex-1 text-xs py-1 rounded bg-caramel-400 text-white hover:bg-caramel-500 disabled:opacity-60 flex items-center justify-center gap-1">
                              {startingIds.has(s.id) ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                              {startingIds.has(s.id) ? '启动中…' : '启动'}
                            </button>
                          )}
                          <button onClick={() => mcpAction(s.id, 'uninstall', s)} disabled={startingIds.has(s.id)} className="text-xs py-1 px-2 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 flex items-center gap-1"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setMarketType('mcp')} className="w-full mt-2 py-1.5 rounded-lg bg-caramel-50 text-caramel-700 text-xs font-medium hover:bg-caramel-100 flex items-center justify-center gap-1"><Store size={12} />打开市场</button>
                  </ExtensionSection>

                  <ExtensionSection
                    icon={<Brain size={14} />}
                    title="Skills"
                    open={skillOpen}
                    onToggle={() => {
                      setSkillOpen(o => !o)
                      if (!skillOpen && skills.length === 0) refreshSkills()
                    }}
                  >
                    {skills.length === 0 ? (
                      <p className="text-xs text-studio-500 py-2">%APPDATA%/ai-workhub/skills/ 下暂无 SKILL.md。可从市场安装或手动编写。</p>
                    ) : skills.map(s => (
                      <div key={s.name} className="border border-studio-200 rounded-lg p-2.5 mb-2 last:mb-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium flex-1 min-w-0 truncate">{s.name}</p>
                          <button onClick={() => toggleSkillView(s)} className="text-xs p-1 hover:bg-studio-100 rounded"><Eye size={12} /></button>
                          <button onClick={() => removeSkill(s.name)} className="text-xs p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 size={12} /></button>
                        </div>
                        <p className="text-xs text-studio-500 mt-0.5 line-clamp-2">{s.description}</p>
                        {expandedSkill === s.name && skillContent[s.name] && (
                          <pre className="text-xs bg-studio-50 p-2 rounded mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">{skillContent[s.name]}</pre>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setMarketType('skill')} className="w-full mt-2 py-1.5 rounded-lg bg-caramel-50 text-caramel-700 text-xs font-medium hover:bg-caramel-100 flex items-center justify-center gap-1"><Store size={12} />打开市场</button>
                  </ExtensionSection>

                  <ExtensionSection
                    icon={<Terminal size={14} />}
                    title="CLI 工具"
                    open={cliOpen}
                    onToggle={() => {
                      setCliOpen(o => !o)
                      if (!cliOpen && cliRows.length === 0) refreshCli()
                    }}
                  >
                    {cliRows.length === 0 ? (
                      <p className="text-xs text-studio-500 py-2">暂无 CLI 记录。点击下方按钮检测系统已装 CLI，或从市场安装新工具。</p>
                    ) : cliRows.map(c => (
                      <div key={c.id} className="border border-studio-200 rounded-lg p-2.5 mb-2 last:mb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-studio-500 truncate">bin: {c.bin || '-'}{c.version ? ` · ${c.version}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => cliAction(c.id, 'detect', c)} className="flex-1 text-xs py-1 rounded bg-studio-100 hover:bg-studio-200">重新检测</button>
                          {c.uninstall_cmd && <button onClick={() => cliAction(c.id, 'uninstall', c)} className="text-xs py-1 px-2 rounded bg-red-50 text-red-600 hover:bg-red-100">卸载</button>}
                          <button onClick={() => cliAction(c.id, 'remove', c)} className="text-xs py-1 px-2 rounded bg-studio-100 text-studio-500 hover:bg-studio-200"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => refreshCli()} className="flex-1 py-1.5 rounded-lg bg-studio-100 text-studio-600 text-xs font-medium hover:bg-studio-200 flex items-center justify-center gap-1"><Power size={12} />检测已装 CLI</button>
                      <button onClick={() => setMarketType('cli')} className="flex-1 py-1.5 rounded-lg bg-caramel-50 text-caramel-700 text-xs font-medium hover:bg-caramel-100 flex items-center justify-center gap-1"><Store size={12} />打开市场</button>
                    </div>
                  </ExtensionSection>

                  <p className="text-xs text-studio-400 pt-2 leading-relaxed">
                    💡 MCP / Skills / CLI 仅在 v2 引擎下生效。市场内容已按"桌面办公伙伴"定位手工筛选，每个条目都有推荐理由。
                  </p>
                </>)}

                {activeTab === 'data' && (<>
                  <div>
                    <p className="text-sm font-medium text-studio-500 mb-3">数据管理</p>
                    <div className="flex gap-2">
                      <button onClick={handleBackup} className="flex-1 py-2 rounded-xl text-xs font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors">立即备份</button>
                      <button onClick={handleExport} className="flex-1 py-2 rounded-xl text-xs font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors">导出数据</button>
                      <button onClick={handleImport} className="flex-1 py-2 rounded-xl text-xs font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors">导入数据</button>
                    </div>
                    <p className="text-xs text-studio-400 mt-3 leading-relaxed">
                      数据存储: SQLite (ai-workhub.db)
                      <br />启动和退出时自动备份，保留最近10份
                      <br />备份目录: %APPDATA%\ai-workhub\backups
                    </p>
                    {backupInfo && <p className="text-xs text-caramel-500 mt-2">{backupInfo}</p>}
                  </div>
                </>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 扩展市场弹窗 */}
      {marketType && (() => {
        // 计算已安装 id 集合（传给 MarketplaceModal 渲染"已安装"状态）
        const installed = new Set<string>()
        if (marketType === 'mcp') mcpServers.forEach(s => installed.add(s.id))
        if (marketType === 'skill') skills.forEach(s => installed.add(s.name))
        if (marketType === 'cli') cliRows.forEach(c => installed.add(c.id))
        return (
          <MarketplaceModal type={marketType} installedIds={installed} onClose={() => {
            setMarketType(null)
            // 安装后刷新对应列表
            refreshMcp(); refreshSkills(); refreshCli()
          }} />
        )
      })()}
    </>
  )
}
