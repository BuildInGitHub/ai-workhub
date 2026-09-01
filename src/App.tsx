import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { 
  Sparkles, Brain, CheckCircle, AlertCircle, 
  FolderOpen, FileText, Folder, Hash, 
  Lightbulb, BarChart3, ListChecks, Link2,
  Home as HomeIcon, Download, Upload, Search,
  Image, Video, Music, Archive, AppWindow
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import SessionManager from './components/SessionManager'
import TabBar from './components/TabBar'
import TaskBar from './components/TaskBar'
import FileManager from './components/FileManager'
import LinkManager from './components/LinkManager'
import TaskManager from './components/TaskManager'
import ProjectManager from './components/ProjectManager'
import QuickLaunch from './components/QuickLaunch'
import Calendar from './components/Calendar'
import GlobalSearch from './components/GlobalSearch'
import FilePreview from './components/FilePreview'
import Home from './components/Home'
import FeedbackDialog from './components/FeedbackDialog'
import { initBuiltinTools, getTools, runAgentLoop, type PlanResult } from './services/agent'
import { runAgentLoopV2, type ToolContext } from './services/agent-pi'
import type { Tab, ChatMessage, FileEntry } from './types'

function App() {
  // 标签页状态
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'home', title: '工作台', type: 'home', icon: 'home', closable: false }
  ])
  const [activeTabId, setActiveTabId] = useState('home')
  
  // 面板状态
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string } | null>(null)
  
  // AI聊天状态
  const [isChatExpanded, setIsChatExpanded] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [agentTools, setAgentTools] = useState<any[]>([])
  // Pi Agent 规划状态
  const [currentPlan, setCurrentPlan] = useState<PlanResult | null>(null)
  
  // DeepSeek API 配置
  const [apiKey, setApiKey] = useState('')
  const [apiKeySet, setApiKeySet] = useState(false)
  
  // 会话状态
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSessionPanel, setShowSessionPanel] = useState(false)
  // 数据刷新信号：AI 任务执行完成后递增，驱动工作台等已挂载组件实时刷新
  const [dataRefreshKey, setDataRefreshKey] = useState(0)

  // 初始化Agent工具
  useEffect(() => {
    if (window.electronAPI) {
      initBuiltinTools(
        window.electronAPI.db.query.bind(window.electronAPI.db),
        window.electronAPI.shell.openExternal.bind(window.electronAPI.shell),
        window.electronAPI.fs.readDir.bind(window.electronAPI.fs),
        window.electronAPI.fs.readFile.bind(window.electronAPI.fs),
        window.electronAPI.os.homeDir.bind(window.electronAPI.os),
        window.electronAPI.fs.moveFile ? window.electronAPI.fs.moveFile.bind(window.electronAPI.fs) : undefined,
        window.electronAPI.wallpaper?.get ? window.electronAPI.wallpaper.get.bind(window.electronAPI.wallpaper) : undefined
      )
      setAgentTools(getTools())
    }
  }, [])

  // 加载保存的API Key
  useEffect(() => {
    const loadApiKey = async () => {
      if (window.electronAPI) {
        const result = await window.electronAPI.db.query(
          "SELECT value FROM settings WHERE key = 'deepseek_api_key'"
        )
        if (result.data && result.data.length > 0 && result.data[0].value) {
          setApiKey(result.data[0].value)
          setApiKeySet(true)
        }
      }
    }
    loadApiKey()
  }, [])

  // AI 引擎版本：v1 自研（默认）/ v2 Pi SDK（实验）
  const [engineVersion, setEngineVersion] = useState<'v1' | 'v2'>('v1')
  useEffect(() => {
    const loadEngineVersion = async () => {
      if (!window.electronAPI) return
      try {
        const r = await window.electronAPI.db.query(
          "SELECT value FROM settings WHERE key = 'engine_version'"
        )
        const v = (r?.data?.[0] as any)?.value
        if (v === 'v1' || v === 'v2') setEngineVersion(v)
      } catch { /* 默认 v1 */ }
    }
    loadEngineVersion()
  }, [])

  // 加载或创建默认会话
  useEffect(() => {
    const initSession = async () => {
      if (!window.electronAPI) return
      
      // 获取最近的会话
      const result = await window.electronAPI.db.query(
        "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1"
      )
      
      if (result.data && result.data.length > 0) {
        setCurrentSessionId(result.data[0].id)
        // 加载该会话的聊天记录
        loadChatHistory(result.data[0].id)
      } else {
        // 创建新会话
        const sessionId = uuidv4()
        const now = new Date().toISOString()
        await window.electronAPI.db.query(
          "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
          [sessionId, '新会话', now, now]
        )
        setCurrentSessionId(sessionId)
      }
    }
    initSession()
  }, [])

  // 加载聊天历史
  const loadChatHistory = async (sessionId: string) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.db.query(
      "SELECT * FROM chat_history WHERE session_id = ? ORDER BY created_at ASC",
      [sessionId]
    )
    if (result.data) {
      setChatMessages(result.data.map((m: any) => ({
        ...m,
        role: m.role as 'user' | 'assistant'
      })))
    }
  }

  // 保存聊天消息到会话
  const saveChatMessage = async (message: ChatMessage) => {
    if (!window.electronAPI || !currentSessionId) return
    await window.electronAPI.db.query(
      "INSERT INTO chat_history (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [message.id, currentSessionId, message.role, message.content, message.created_at]
    )
    // 更新会话时间
    await window.electronAPI.db.query(
      "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
      [currentSessionId]
    )
    // 如果是首条用户消息且会话还是默认标题，自动命名会话
    if (message.role === 'user') {
      const sessionResult = await window.electronAPI.db.query(
        "SELECT * FROM sessions WHERE id = ?",
        [currentSessionId]
      )
      const session = sessionResult.data?.[0]
      if (session && /^新会话/.test(session.title)) {
        const autoTitle = message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
        await window.electronAPI.db.query(
          "UPDATE sessions SET title = ? WHERE id = ?",
          [autoTitle, currentSessionId]
        )
      }
    }
  }

  // 切换会话
  const handleSessionSelect = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    await loadChatHistory(sessionId)
  }

  // 新建会话
  const handleNewChat = async () => {
    if (!window.electronAPI) return
    const sessionId = uuidv4()
    const now = new Date().toISOString()
    await window.electronAPI.db.query(
      "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [sessionId, '新会话', now, now]
    )
    setCurrentSessionId(sessionId)
    setChatMessages([])
  }

  // 切换标签页
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  // 关闭标签页
  const handleTabClose = useCallback((tabId: string) => {
    if (tabId === 'home') return
    
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId)
      
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId)
        const newActiveIndex = Math.max(0, closedIndex - 1)
        setActiveTabId(newTabs[newActiveIndex].id)
      }
      
      return newTabs
    })
  }, [activeTabId])

  // 添加新标签页
  const handleAddTab = useCallback((type: Tab['type'], title: string) => {
    const newTab: Tab = {
      id: uuidv4(),
      title,
      type,
      closable: true
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [])

  // 渲染当前标签页内容
  const renderContent = () => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return <Home onAddTab={handleAddTab} refreshKey={dataRefreshKey} />

    switch (activeTab.type) {
      case 'files':
        return <FileManager onFilePreview={setPreviewFile} refreshKey={dataRefreshKey} />
      case 'links':
        return <LinkManager refreshKey={dataRefreshKey} />
      case 'tasks':
        return <TaskManager refreshKey={dataRefreshKey} />
      case 'projects':
        return <ProjectManager refreshKey={dataRefreshKey} />
      case 'quick-launch':
        return <QuickLaunch refreshKey={dataRefreshKey} />
      case 'calendar':
        return <Calendar refreshKey={dataRefreshKey} />
      case 'search':
        return <GlobalSearch onClose={() => handleAddTab('home', '工作台')} />
      case 'home':
      default:
        return <Home onAddTab={handleAddTab} refreshKey={dataRefreshKey} />
    }
  }

  // 纯对话模式：带完整会话历史 + 长期记忆
  // v2 引擎需要的 ToolContext：复用与 v1 initBuiltinTools 同样的 IPC 注入
  const buildV2ToolContext = (): ToolContext => {
    const api = window.electronAPI!
    const wp = api.wallpaper!
    return {
      dbQuery: (sql, params) => api.db.query(sql, params) as any,
      fsReadDir: (path) => api.fs.readDir(path) as any,
      fsReadFile: (path) => api.fs.readFile(path) as any,
      osHomeDir: async () => ({ data: await api.os.homeDir() }),
      shellOpenExternal: (url) => api.shell.openExternal(url) as any,
      fsMoveFile: api.fs.moveFile
        ? (src, dest) => api.fs.moveFile!(src, dest) as any
        : undefined,
      getWallpaper: async () => (await wp.get()) || '',
      restoreWallpaper: () => wp.restore() as any,
    }
  }

  const handlePlainChat = async (message: string) => {
    // 读取长期记忆注入系统提示
    let memoryPrompt = ''
    try {
      const memResult = await window.electronAPI?.db.query(
        "SELECT * FROM memories ORDER BY created_at DESC LIMIT 10"
      )
      const memories = memResult?.data || []
      if (memories.length > 0) {
        memoryPrompt = '\n\n用户长期记忆（自然地参考，不要生硬罗列）:\n' + memories.map((m: any) => `- ${m.content}`).join('\n')
      }
    } catch { /* 忽略 */ }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是AI WorkHub的智能助手，一个专业的桌面办公伙伴。既能自然地聊天、解答问题、提供建议，也能操作文件、链接、任务等（需要操作时系统会自动执行工具）。用友好、自然的中文回复，保持简洁。对话历史里可能包含之前执行过的工具操作记录（如任务/链接的操作结果），请自然地延续对话，不要重复执行操作或复述工具细节。' + memoryPrompt
          },
          ...chatMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    const data = await response.json()

    // 检查 API 错误响应，抛出真实原因
    if (!response.ok || !data.choices || !data.choices[0]) {
      const apiError = data?.error?.message || data?.message || `HTTP ${response.status}`
      throw new Error(`DeepSeek API 错误: ${apiError}`)
    }

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: data.choices[0].message.content,
      created_at: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, assistantMessage])
    saveChatMessage(assistantMessage)
  }

  // AI聊天功能
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, userMessage])
    saveChatMessage(userMessage)
    setIsLoading(true)

    if (!apiKey) {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '请先设置 DeepSeek API Key 才能使用AI功能。您可以在设置中配置API Key。',
        created_at: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
      saveChatMessage(errorMessage)
      setIsLoading(false)
      return
    }

    try {
      // 引擎分发：v1 自研 / v2 Pi SDK（实验）
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }))
      const loopOutcome = engineVersion === 'v2'
        ? await runAgentLoopV2(message, apiKey, history, buildV2ToolContext())
        : await runAgentLoop(message, apiKey, history)

      // 纯聊天：无需执行工具，直接走对话（不显示思考过程）
      if (!loopOutcome.needsExecution) {
        await handlePlainChat(message)
        setCurrentPlan(null)
        setDataRefreshKey(k => k + 1)
        setIsLoading(false)
        return
      }

      const taskPlan = loopOutcome.plan

      // 显示思考过程（重规划过程透明可见）
      setCurrentPlan(taskPlan)

      const replanSection = loopOutcome.rounds > 1
        ? `[RefreshCw] 首轮结果未完全满足需求，已自动重规划（共 ${loopOutcome.rounds} 轮）\n${loopOutcome.feedbacks.map(f => `   → ${f.slice(0, 80)}`).join('\n')}\n\n`
        : ''

      // 添加思考过程消息 - 更友好的格式
      const thoughtMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `${replanSection}[Brain] ${taskPlan.thought}\n\n[ListChecks] 计划执行 ${taskPlan.steps.length} 个步骤:\n${taskPlan.steps.map((s, i) => `${i+1}. ${s.description}`).join('\n')}`,
        created_at: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, thoughtMessage])
      saveChatMessage(thoughtMessage)
      
      let responseContent = ''
      
      if (taskPlan.needsExecution && taskPlan.steps.length > 0) {
        // 循环引擎已执行完所有轮次，直接使用最终执行结果
        const execResult = loopOutcome.execResult
        
        if (execResult.success) {
          // 格式化执行结果
          const stepResults = execResult.steps.map((s, i) => {
            let resultText = ''
            if (s.output) {
              // 简化输出显示
              if (typeof s.output === 'object') {
                // 数组结果：按数据形态分类渲染
                if (Array.isArray(s.output)) {
                  const items = s.output
                  const hasFileFields = items.some((x: any) => x.isFile !== undefined || x.isDirectory !== undefined)
                  const hasLinkFields = items.some((x: any) => x.url !== undefined && x.title !== undefined)
                  const hasTaskFields = items.some((x: any) => x.completed !== undefined && x.title !== undefined)

                  if (hasLinkFields) {
                    // 链接列表
                    const links = items.slice(0, 10)
                    resultText = `[Link2] 找到 ${items.length} 个收藏链接:\n`
                    links.forEach((l: any) => {
                      resultText += `   [Link2] ${l.title} - ${l.url}`
                      if (l.category) resultText += ` (${l.category})`
                      resultText += '\n'
                    })
                    if (items.length > 10) {
                      resultText += `   ... 还有 ${items.length - 10} 个链接`
                    }
                  } else if (hasTaskFields) {
                    // 任务列表
                    const tasks = items.slice(0, 10)
                    resultText = `[ListChecks] 找到 ${items.length} 个任务:\n`
                    tasks.forEach((t: any) => {
                      const statusMark = t.completed ? '[CheckCircle] ' : (t.status === 'doing' ? '[Zap] ' : '')
                      resultText += `   ${statusMark}${t.title}`
                      if (t.parent_id) resultText += ' (子任务)'
                      resultText += '\n'
                    })
                    if (items.length > 10) {
                      resultText += `   ... 还有 ${items.length - 10} 个任务`
                    }
                  } else if (hasFileFields) {
                    // 目录列表
                    const files = items.filter((f: any) => f.isFile).slice(0, 10)
                    const folders = items.filter((f: any) => f.isDirectory).slice(0, 5)
                    if (files.length > 0 || folders.length > 0) {
                      resultText = '[FolderOpen] 文件/文件夹:\n'
                      folders.forEach((f: any) => {
                        resultText += `   [Folder] ${f.name}/\n`
                      })
                      files.forEach((f: any) => {
                        resultText += `   [FileText] ${f.name}\n`
                      })
                      if (items.length > 15) {
                        resultText += `   ... 还有 ${items.length - 15} 个项目`
                      }
                    } else {
                      resultText = '[FolderOpen] 目录为空'
                    }
                  } else {
                    // 其他数组：逐项展示 title/name
                    resultText = `[ListChecks] 共 ${items.length} 项:\n`
                    items.slice(0, 10).forEach((x: any) => {
                      resultText += `   • ${x.title || x.name || JSON.stringify(x).slice(0, 50)}\n`
                    })
                  }
                } else if (s.output.message) {
                  resultText = s.output.message
                } else if (s.output.items && s.output.count !== undefined) {
                  // 快速启动列表
                  const items = s.output.items || []
                  const typeLabels: Record<string, string> = { app: '应用', file: '文件', folder: '文件夹', link: '链接' }
                  const typeIcons: Record<string, string> = { app: '[AppWindow]', file: '[FileText]', folder: '[Folder]', link: '[Link2]' }
                  resultText = `[Zap] 共 ${s.output.count} 个快速启动项:\n`
                  items.slice(0, 8).forEach((x: any) => {
                    resultText += `   ${typeIcons[x.type] || '[Zap]'} ${x.name} (${typeLabels[x.type] || x.type})\n`
                  })
                  if (items.length > 8) {
                    resultText += `   ... 还有 ${items.length - 8} 个项目`
                  }
                } else if (s.output.stats) {
                  resultText = `[BarChart3] 统计: ${s.output.stats.totalFiles}个文件, ${s.output.stats.totalFolders}个文件夹`
                  if (s.output.suggestions?.length > 0) {
                    resultText += '\n[Lightbulb] ' + s.output.suggestions.join('\n[Lightbulb] ')
                  }
                } else if (s.output.desktopPath) {
                  resultText = `[FolderOpen] 桌面路径: ${s.output.desktopPath}`
                } else if (s.output.path) {
                  resultText = `[FolderOpen] 路径: ${s.output.path}`
                } else if (s.output.id && s.output.title) {
                  resultText = `[CheckCircle] 已创建: ${s.output.title}`
                } else {
                  resultText = JSON.stringify(s.output).slice(0, 100)
                }
              } else {
                resultText = String(s.output).slice(0, 100)
              }
            }
            return `[CheckCircle] 步骤${i+1}: ${s.tool}\n   ${resultText}`
          }).join('\n\n')
          
          responseContent = `[Sparkles] 任务完成！\n\n${stepResults}`
        } else {
          const failedSteps = execResult.steps
            .filter(s => s.error)
            .map((s, i) => `[AlertCircle] 步骤${i+1}: ${s.tool} - ${s.error}`)
            .join('\n')
          responseContent = `[AlertCircle] 执行中断\n\n已完成 ${execResult.steps.filter(s => s.output).length} 个步骤\n\n${failedSteps}`
        }
        
        const resultMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: responseContent,
          created_at: new Date().toISOString()
        }
        setChatMessages(prev => [...prev, resultMessage])
        saveChatMessage(resultMessage)
        setCurrentPlan(null)
      }
      setCurrentPlan(null)
      // AI 可能创建/修改了数据（快速启动、任务、链接等），通知已挂载组件实时刷新
      setDataRefreshKey(k => k + 1)
    } catch (error: any) {
      console.error('AI请求失败:', error)
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `抱歉，AI请求失败了: ${error.message}。请检查API Key是否正确。`,
        created_at: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
      saveChatMessage(errorMessage)
      setCurrentPlan(null)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, chatMessages, currentSessionId])

  // 保存API Key
  const handleSaveApiKey = useCallback(async (key: string) => {
    setApiKey(key)
    if (window.electronAPI) {
      await window.electronAPI.db.query("DELETE FROM settings WHERE key = 'deepseek_api_key'")
      await window.electronAPI.db.query(
        "INSERT INTO settings (key, value) VALUES ('deepseek_api_key', ?)",
        [key]
      )
    }
    setApiKeySet(true)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-studio-100 text-ink-100">
      {/* 主内容区 */}
      <div className="flex-1 flex min-h-0">
        {/* 会话管理面板 */}
        {showSessionPanel && (
          <div className="w-64 flex-shrink-0 animate-slideIn">
            <SessionManager
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onNewChat={handleNewChat}
            />
          </div>
        )}

        {/* 左侧边栏 - AI伙伴 */}
        <Sidebar
          isExpanded={isChatExpanded}
          onToggle={() => setIsChatExpanded(!isChatExpanded)}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          apiKey={apiKey}
          onSaveApiKey={handleSaveApiKey}
          apiKeySet={apiKeySet}
          onNavigate={handleAddTab}
          onShowSessions={() => setShowSessionPanel(!showSessionPanel)}
          isSessionPanelOpen={showSessionPanel}
          engineVersion={engineVersion}
          onChangeEngine={setEngineVersion}
        />

        {/* 中间工作区 */}
        <div className="flex-1 flex flex-col min-w-0 bg-studio-50">
          {/* 标签栏 */}
          <TabBar 
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onAddTab={handleAddTab}
          />

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* 底部任务栏 */}
      <TaskBar 
        activeTabCount={tabs.length}
        onSearchClick={() => setShowSearch(true)}
        onSettingsClick={() => setShowSettings(true)}
        onFeedbackClick={() => setShowFeedback(true)}
      />

      {/* 全局搜索 */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

      {/* 意见反馈 */}
      {showFeedback && <FeedbackDialog onClose={() => setShowFeedback(false)} />}

      {/* 文件预览 */}
      {previewFile && (
        <FilePreview 
          filePath={previewFile.path}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}

export default App
