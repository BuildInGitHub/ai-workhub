import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Sidebar from './components/Sidebar'
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
import { initBuiltinTools, getTools, planTask, executePlan, type PlanResult } from './services/agent'
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

  // 初始化Agent工具
  useEffect(() => {
    if (window.electronAPI) {
      initBuiltinTools(
        window.electronAPI.db.query.bind(window.electronAPI.db),
        window.electronAPI.shell.openExternal.bind(window.electronAPI.shell),
        window.electronAPI.fs.readDir.bind(window.electronAPI.fs),
        window.electronAPI.fs.readFile.bind(window.electronAPI.fs),
        window.electronAPI.os.homeDir.bind(window.electronAPI.os)
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
    if (!activeTab) return <Home onAddTab={handleAddTab} />

    switch (activeTab.type) {
      case 'files':
        return <FileManager onFilePreview={setPreviewFile} />
      case 'links':
        return <LinkManager />
      case 'tasks':
        return <TaskManager />
      case 'projects':
        return <ProjectManager />
      case 'quick-launch':
        return <QuickLaunch />
      case 'calendar':
        return <Calendar />
      case 'search':
        return <GlobalSearch onClose={() => handleAddTab('home', '工作台')} />
      case 'home':
      default:
        return <Home onAddTab={handleAddTab} />
    }
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
    setIsLoading(true)

    if (!apiKey) {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '请先设置 DeepSeek API Key 才能使用AI功能。您可以在设置中配置API Key。',
        created_at: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
      return
    }

    try {
      // 使用Pi Agent增强任务规划
      const taskPlan = await planTask(message, apiKey)
      
      // 显示思考过程
      setCurrentPlan(taskPlan)
      
      // 添加思考过程消息
      const thoughtMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `[思考中]\n\n${taskPlan.thought}\n\n计划执行 ${taskPlan.steps.length} 个步骤:` + 
          taskPlan.steps.map((s, i) => `\n${i+1}. ${s.description}`).join(''),
        created_at: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, thoughtMessage])
      
      let responseContent = ''
      
      if (taskPlan.needsExecution && taskPlan.steps.length > 0) {
        // 执行计划
        const execResult = await executePlan(taskPlan)
        
        if (execResult.success) {
          responseContent = `[任务完成]\n\n` + 
            execResult.steps.map((s, i) => `步骤${i+1}: ${s.tool}\n结果: ${JSON.stringify(s.output, null, 2)}`).join('\n\n')
        } else {
          responseContent = `[执行中断] ${execResult.finalResult}\n\n` +
            execResult.steps.map((s, i) => `步骤${i+1}: ${s.tool} - ${s.error || '完成'}`).join('\n')
        }
        
        const resultMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: responseContent,
          created_at: new Date().toISOString()
        }
        setChatMessages(prev => [...prev, resultMessage])
        setCurrentPlan(null)
      } else {
        // 不需要执行，使用普通对话
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是AI WorkHub的智能助手，一个专业的桌面办公助手。可以帮助用户管理文件、链接、任务，进行智能分析和建议。用友好，专业的中文回复。' },
              ...chatMessages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 2048
          })
        })

        const data = await response.json()
        
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: data.choices[0].message.content,
          created_at: new Date().toISOString()
        }
        
        setChatMessages(prev => [...prev, assistantMessage])
        
        // 保存到数据库
        if (window.electronAPI) {
          await window.electronAPI.db.query(
            "INSERT INTO chat_history (id, role, content) VALUES (?, ?, ?)",
            [userMessage.id, userMessage.role, userMessage.content]
          )
          await window.electronAPI.db.query(
            "INSERT INTO chat_history (id, role, content) VALUES (?, ?, ?)",
            [assistantMessage.id, assistantMessage.role, assistantMessage.content]
          )
        }
      }
      setCurrentPlan(null)
    } catch (error: any) {
      console.error('AI请求失败:', error)
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `抱歉，AI请求失败了: ${error.message}。请检查API Key是否正确。`,
        created_at: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
      setCurrentPlan(null)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, chatMessages])

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
        {/* 左侧边栏 - AI助手 */}
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
      />

      {/* 全局搜索 */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

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
