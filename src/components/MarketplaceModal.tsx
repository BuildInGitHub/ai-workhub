// MarketplaceModal
// 设置 → "打开市场"按钮 → 拉远端 JSON（无网时 fallback 种子）→ 按 type 过滤 → 列卡片
// 每张卡片"安装"按钮：mcp 走 mcp:install，skill 走 skill:installFromMarket，cli 走 cli:install

import { useEffect, useState } from 'react'
import { X, Package, Download, AlertCircle, CheckCircle, Loader2, ChevronDown } from 'lucide-react'
import { fetchMarket, type MarketItem, type ItemType } from '../services/marketplace'

interface MarketplaceModalProps {
  type: ItemType
  /** 已安装条目的 id 集合，用于"已安装"状态 */
  installedIds: Set<string>
  onClose: () => void
}

export default function MarketplaceModal({ type, installedIds, onClose }: MarketplaceModalProps) {
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    fetchMarket()
      .then(r => { setItems(r.items.filter(i => i.type === type)) })
      .finally(() => setLoading(false))
  }, [type])

  const handleInstall = async (item: MarketItem) => {
    setInstalling(item.id)
    setErrors(s => { const n = { ...s }; delete n[item.id]; return n })
    try {
      let res: any
      if (item.type === 'mcp') {
        res = await window.electronAPI?.mcp?.install?.({
          id: item.id, name: item.name, package: item.package,
          command: item.command, args: item.args, env: item.env,
        })
      } else if (item.type === 'skill') {
        res = await window.electronAPI?.skill?.installFromMarket?.({ name: item.name, manifest: item.manifest })
      } else if (item.type === 'cli') {
        res = await window.electronAPI?.cli?.install?.({
          name: item.name, install_cmd: item.install_cmd, uninstall_cmd: item.uninstall_cmd, bin: item.bin,
        })
      }
      if (!res?.ok) setErrors(e => ({ ...e, [item.id]: res?.error || '安装失败' }))
    } catch (e: any) {
      setErrors(er => ({ ...er, [item.id]: e.message }))
    }
    setInstalling('')
  }

  const typeLabel = { mcp: 'MCP Server', skill: 'Skill 包', cli: 'CLI 工具' }[type]

  return (
    <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl p-6 w-[760px] max-w-[95vw] max-h-[85vh] shadow-elevated animate-slideIn flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">扩展市场 — {typeLabel}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-studio-100 rounded-xl"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && <p className="text-sm text-studio-500 py-8 text-center">加载中…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-studio-500 py-8 text-center">此分类暂无条目</p>}
          {items.map(item => {
            return (
              <div key={item.id} className="border border-studio-200 rounded-xl p-4 hover:border-caramel-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-caramel-50 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-caramel-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-ink-100">{item.name}</h4>
                      <code className="text-xs text-studio-500 bg-studio-100 px-1.5 py-0.5 rounded">{item.package}</code>
                    </div>
                    <p className="text-sm text-studio-500 mt-1 leading-relaxed">{item.description}</p>
                    {item.requires && item.requires.length > 0 && (
                      <div className="mt-2 px-3 py-1.5 bg-studio-100 border border-studio-200 rounded-lg">
                        <p className="text-xs text-studio-600 leading-relaxed">
                          <span className="font-medium">前置依赖：</span>{item.requires.join(' · ')}
                        </p>
                      </div>
                    )}
                    {item.reason && (
                      <div className="mt-2 px-3 py-2 bg-caramel-50 border border-caramel-100 rounded-lg">
                        <p className="text-xs text-caramel-700 leading-relaxed">
                          <span className="font-medium">推荐理由：</span>{item.reason}
                        </p>
                      </div>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {item.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-studio-100 text-studio-600">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleInstall(item)}
                    disabled={installing === item.id || installedIds.has(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm flex-shrink-0 transition-colors ${
                      installedIds.has(item.id)
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-caramel-400 text-white hover:bg-caramel-500 disabled:opacity-50'
                    }`}
                  >
                    {installedIds.has(item.id) ? (
                      <><CheckCircle size={14} />已安装</>
                    ) : (
                      <>
                        <Download size={14} className={installing === item.id ? 'animate-bounce' : ''} />
                        {installing === item.id ? (
                          <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" />安装中</span>
                        ) : '安装'}
                      </>
                    )}
                  </button>
                </div>
                {errors[item.id] && (
                  <p className="mt-2 text-xs text-red-600 line-clamp-2">✗ {errors[item.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}