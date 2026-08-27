import { useState, useRef, useEffect } from 'react'
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
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
  Home
} from 'lucide-react'
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
  onNavigate
}: SidebarProps) {
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [tempApiKey, setTempApiKey] = useState(apiKey)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
                <h2 className="font-display font-semibold text-ink-100">AI 助手</h2>
                <p className="text-xs text-studio-500">智能办公伙伴</p>
              </div>
            </div>
          )}
          <button 
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-studio-200 transition-colors text-studio-500"
          >
            {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
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
                  <h3 className="font-display text-lg text-ink-100 mb-1">你好，我是 AI 助手</h3>
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
                  <div 
                    className={`max-w-[85%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-caramel-400 to-caramel-500 text-white' 
                        : 'bg-white border border-studio-300 text-ink-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-studio-300 p-4 rounded-2xl">
                    <Loader2 size={20} className="animate-spin text-caramel-400" />
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
              title="展开AI助手"
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
              
              <button 
                onClick={handleSaveSettings}
                className="w-full btn btn-primary"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
