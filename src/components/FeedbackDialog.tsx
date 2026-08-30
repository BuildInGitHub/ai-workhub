import { useState } from 'react'
import { 
  X, Bug, Lightbulb, MessageCircle, Github, Copy, Check, Send
} from 'lucide-react'

const REPO_URL = 'https://github.com/BuildInGitHub/ai-workhub'

const TYPES = [
  { key: 'bug', label: '问题反馈', icon: <Bug size={18} />, color: 'bg-red-50 text-red-500 border-red-200' },
  { key: 'feature', label: '功能建议', icon: <Lightbulb size={18} />, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { key: 'other', label: '其他', icon: <MessageCircle size={18} />, color: 'bg-blue-50 text-blue-500 border-blue-200' },
] as const

// 收集环境信息
function getEnvInfo(): string {
  const ua = navigator.userAgent
  const isWin = /Windows/.test(ua)
  const os = isWin ? 'Windows' : (/Mac/.test(ua) ? 'macOS' : 'Linux')
  const chromeVer = ua.match(/Chrome\/([\d.]+)/)?.[1] || '未知'
  return [
    `- 操作系统: ${os}`,
    `- 内核: Chromium ${chromeVer} (Electron)`,
    `- 应用版本: 1.0.0`,
    `- 提交时间: ${new Date().toLocaleString('zh-CN')}`,
  ].join('\n')
}

interface FeedbackDialogProps {
  onClose: () => void
}

export default function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const [type, setType] = useState<'bug' | 'feature' | 'other'>('bug')
  const [title, setTitle] = useState('')
  const [copied, setCopied] = useState(false)

  const typeLabel = TYPES.find(t => t.key === type)?.label || '其他'
  const issueTitle = title.trim() ? `[${typeLabel}] ${title.trim()}` : ''
  const issueBody = [
    '### 反馈类型',
    typeLabel,
    '',
    '### 问题描述',
    '(请在此补充详细内容：发生了什么、期望是什么、复现步骤等)',
    '',
    '### 环境信息',
    getEnvInfo(),
    '',
    '---',
    '*由 AI WorkHub 意见反馈入口自动生成*',
  ].join('\n')

  // 提交：打开预填好的 GitHub 新 Issue 页面
  const handleSubmit = () => {
    const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`
    window.electronAPI?.shell.openExternal(url)
    onClose()
  }

  // 复制反馈内容（备用）
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`标题: ${issueTitle}\n\n${issueBody}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-ink-400/40 flex items-center justify-center z-[100] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl w-[480px] shadow-elevated animate-slideIn overflow-hidden">
        {/* 顶部 */}
        <div className="h-1.5 bg-gradient-to-r from-caramel-400 to-caramel-500" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-studio-100 flex items-center justify-center">
                <Github size={20} className="text-ink-100" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-100">意见反馈</h3>
                <p className="text-xs text-studio-400">提交到 GitHub Issues，感谢让应用变得更好</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-studio-100 rounded-xl text-studio-400">
              <X size={20} />
            </button>
          </div>

          {/* 类型选择 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${
                  type === t.key
                    ? t.color + ' ring-2 ring-offset-1 ring-caramel-300'
                    : 'bg-studio-50 border-studio-200 text-studio-400 hover:border-studio-300'
                }`}
              >
                {t.icon}
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* 标题 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-studio-500 mb-2">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="一句话概括，如：看板拖拽时偶现闪烁"
              className="input"
            />
          </div>

          {/* 环境信息预览 */}
          <div className="mb-5">
            <p className="text-xs font-medium text-studio-400 mb-2">
              环境信息将自动附加（无需填写）
            </p>
            <pre className="text-xs text-studio-400 bg-studio-50 rounded-xl p-3 whitespace-pre-wrap border border-studio-100 max-h-28 overflow-y-auto">
{getEnvInfo()}
            </pre>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors"
              title="复制反馈内容，手动去 GitHub 粘贴"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? '已复制' : '复制内容'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium bg-gradient-to-r from-caramel-400 to-caramel-500 text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-soft"
            >
              <Send size={16} />
              提交到 GitHub
            </button>
          </div>

          <p className="text-xs text-studio-400 mt-3 text-center">
            将在浏览器中打开预填好的 Issue 页面，登录 GitHub 后点提交即可
          </p>
        </div>
      </div>
    </div>
  )
}
