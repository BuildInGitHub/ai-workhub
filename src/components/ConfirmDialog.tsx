import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  itemName?: string
  /** 额外的详细信息行，如 [{label: '聊天记录', value: '14 条'}] */
  details?: Array<{ label: string; value: string }>
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  itemName,
  details,
  confirmText = '删除',
  cancelText = '取消',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Escape 键关闭 + Enter 确认
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    confirmButtonRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-ink-400/50 flex items-center justify-center z-[100] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="bg-white rounded-3xl w-[440px] shadow-elevated overflow-hidden animate-slideIn">
        {/* 顶部警示条 */}
        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-orange-400" />
        
        <div className="p-6">
          {/* 图标和标题 */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center flex-shrink-0 border border-red-100">
              <AlertTriangle size={26} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="font-display text-lg font-semibold text-ink-100">{title}</h3>
              <p className="text-sm text-studio-500 leading-relaxed mt-1">{message}</p>
            </div>
            <button 
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 hover:text-ink-100 flex-shrink-0 transition-colors"
              title="关闭 (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* 待删除项名称 */}
          {itemName && (
            <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-studio-100 rounded-2xl border border-studio-200">
              <Trash2 size={16} className="text-studio-400 flex-shrink-0" />
              <span className="text-sm text-ink-100 font-medium truncate flex-1">{itemName}</span>
            </div>
          )}

          {/* 详细信息 */}
          {details && details.length > 0 && (
            <div className="px-4 py-3 mb-4 bg-red-50/60 rounded-2xl border border-red-100 space-y-2">
              {details.map((d) => (
                <div key={d.label} className="flex items-center justify-between text-sm">
                  <span className="text-studio-500">{d.label}</span>
                  <span className="text-red-500 font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {!details && <div className="mb-4" />}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl text-sm font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 active:scale-[0.98] transition-all"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 active:scale-[0.98] transition-all shadow-soft flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
