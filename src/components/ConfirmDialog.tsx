import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  itemName?: string
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
  confirmText = '删除',
  cancelText = '取消',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Escape 键关闭
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // 打开时聚焦确认按钮，支持回车直接确认
    confirmButtonRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-ink-400/40 flex items-center justify-center z-[100] backdrop-blur-sm animate-slideIn"
      onClick={(e) => {
        // 点击遮罩层关闭（避免点击内容区域误关）
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="bg-white rounded-2xl p-6 w-[400px] shadow-elevated">
        {/* 图标和标题 */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-semibold text-ink-100 mb-1">{title}</h3>
            <p className="text-sm text-studio-500 leading-relaxed">
              {message}
              {itemName && (
                <span className="block mt-2 px-3 py-2 bg-studio-100 rounded-xl text-ink-100 font-medium truncate">
                  {itemName}
                </span>
              )}
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-studio-100 text-studio-400 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-studio-100 text-studio-600 hover:bg-studio-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
