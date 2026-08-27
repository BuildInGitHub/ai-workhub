import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  X,
  Sparkles,
  Clock
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import ConfirmDialog from './ConfirmDialog'

interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface SessionManagerProps {
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewChat: () => void
  refreshKey?: number
}

export default function SessionManager({ 
  currentSessionId, 
  onSessionSelect,
  onNewChat,
  refreshKey
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)

  useEffect(() => {
    loadSessions()
  }, [refreshKey, currentSessionId])

  const loadSessions = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.db.query(
        "SELECT * FROM sessions ORDER BY updated_at DESC"
      )
      if (result.data) {
        setSessions(result.data)
      }
    } catch (error) {
      console.error('加载会话失败:', error)
    }
  }

  const createSession = async () => {
    if (!window.electronAPI) return
    const title = newTitle.trim() || `新会话 ${sessions.length + 1}`
    const id = uuidv4()
    const now = new Date().toISOString()
    
    try {
      await window.electronAPI.db.query(
        "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [id, title, now, now]
      )
      loadSessions()
      onSessionSelect(id)
      setShowNewModal(false)
      setNewTitle('')
    } catch (error) {
      console.error('创建会话失败:', error)
    }
  }

  const deleteSession = async (id: string) => {
    if (!window.electronAPI) return
    try {
      // 同时删除该会话的所有聊天记录
      await window.electronAPI.db.query(
        "DELETE FROM chat_history WHERE session_id = ?", 
        [id]
      )
      await window.electronAPI.db.query(
        "DELETE FROM sessions WHERE id = ?", 
        [id]
      )
      loadSessions()
      
      if (id === currentSessionId) {
        const remaining = sessions.filter(s => s.id !== id)
        if (remaining.length > 0) {
          // 切换到剩余的第一个会话
          onSessionSelect(remaining[0].id)
        } else {
          // 删完了，新建一个空会话
          onNewChat()
        }
      }
    } catch (error) {
      console.error('删除会话失败:', error)
    }
  }

  const updateSessionTitle = async (id: string, title: string) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.db.query(
        "UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
        [title, id]
      )
      loadSessions()
    } catch (error) {
      console.error('更新会话失败:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white border-r border-studio-200">
        {/* 头部 */}
        <div className="p-4 border-b border-studio-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-ink-100 flex items-center gap-2">
              <MessageSquare size={18} className="text-caramel-400" />
              会话
            </h2>
            <button
              onClick={() => setShowNewModal(true)}
              className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-500"
              title="新建会话"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-caramel-400 to-caramel-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            <Sparkles size={16} />
            新建对话
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-studio-400 p-4">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-sm">暂无会话</p>
              <p className="text-xs">点击上方按钮开始新对话</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    session.id === currentSessionId 
                      ? 'bg-caramel-50 border border-caramel-200' 
                      : 'hover:bg-studio-100'
                  }`}
                >
                  <MessageSquare 
                    size={16} 
                    className={session.id === currentSessionId ? 'text-caramel-400' : 'text-studio-400'} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      session.id === currentSessionId ? 'font-medium text-ink-100' : 'text-studio-600'
                    }`}>
                      {session.title}
                    </p>
                    <p className="text-xs text-studio-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(session.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(session)
                    }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-studio-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新建会话弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[400px] shadow-elevated animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">新建会话</h3>
              <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-studio-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入会话标题（可选）"
              className="input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createSession()}
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 btn btn-secondary"
              >
                取消
              </button>
              <button
                onClick={createSession}
                className="flex-1 btn btn-primary"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 删除会话确认框 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除会话"
        message="删除后将同时清除该会话的全部聊天记录，且无法恢复。确定要删除吗？"
        itemName={deleteTarget?.title}
        confirmText="删除会话"
        onConfirm={() => {
          if (deleteTarget) deleteSession(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
