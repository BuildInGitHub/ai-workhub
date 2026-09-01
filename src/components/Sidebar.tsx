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
  AppWindow
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
              <span className="text-sm">API 设置</span>
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

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold">API 设置</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1.5 hover:bg-studio-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-studio-500 mb-2">
                  DeepSeek API Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-xxxx..."
                  className="input"
                />
                <p className="text-xs text-studio-500 mt-2">
                  请从 DeepSeek 官网获取API Key
                </p>
              </div>
              
              {apiKeySet && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  ✓ API Key 已配置
                </p>
              )}

              {/* AI 引擎选择（v1 稳定 / v2 Pi SDK 实验） */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-studio-500 mb-2">
                  AI 引擎
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleChangeEngine('v1')}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      engineVersion === 'v1'
                        ? 'bg-caramel-400 text-white'
                        : 'bg-studio-100 text-studio-500 hover:text-ink-100'
                    }`}
                  >
                    v1 自研（稳定）
                  </button>
                  <button
                    onClick={() => handleChangeEngine('v2')}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      engineVersion === 'v2'
                        ? 'bg-caramel-400 text-white'
                        : 'bg-studio-100 text-studio-500 hover:text-ink-100'
                    }`}
                    title="基于 @earendil-works/pi-agent-core（Pi SDK v0.83.0）"
                  >
                    v2 Pi SDK（实验）
                  </button>
                </div>
                <p className="text-xs text-studio-400 mt-2 leading-relaxed">
                  v1 自研引擎（默认）— 已稳定的规划/执行/校验/重规划循环
                  <br />
                  v2 基于 Pi SDK 内核 — 新架构，可能存在不稳定
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full btn btn-primary"
              >
                保存设置
              </button>

              {/* 数据管理 */}
              <div className="pt-4 mt-2 border-t border-studio-100">
                <p className="text-sm font-medium text-studio-500 mb-3">数据管理</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleBackup}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors"
                  >
                    立即备份
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors"
                  >
                    导出数据
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors"
                  >
                    导入数据
                  </button>
                </div>
                <p className="text-xs text-studio-400 mt-3 leading-relaxed">
                  数据存储: SQLite (ai-workhub.db)
                  <br />
                  启动和退出时自动备份，保留最近10份
                  <br />
                  备份目录: %APPDATA%\ai-workhub\backups
                </p>
                {backupInfo && (
                  <p className="text-xs text-caramel-500 mt-2">{backupInfo}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
