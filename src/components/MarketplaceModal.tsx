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
  // 本地已安装集合：合并父组件传入 + 安装成功时新增，关闭时丢弃
  const [localInstalled, setLocalInstalled] = useState<Set<string>>(new Set())
  // 父组件传入的 installedIds 变化时同步到 localInstalled
  useEffect(() => {
    setLocalInstalled(new Set(installedIds))
  }, [installedIds])

  // 打开时主动从主进程拉已安装列表（不依赖父组件 prop，避免父级懒加载导致 0）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (type === 'mcp') {
          const r = await window.electronAPI?.mcp?.listServers?.()
          const ids = new Set((r?.data || []).map((s: any) => s.id))
          if (!cancelled) setLocalInstalled(prev => new Set([...prev, ...ids]))
        } else if (type === 'skill') {
          const list = await window.electronAPI?.skill?.list?.()
          const ids = new Set((list || []).map((s: any) => s.name))
          if (!cancelled) setLocalInstalled(prev => new Set([...prev, ...ids]))
        } else if (type === 'cli') {
          const r = await window.electronAPI?.cli?.list?.()
          const ids = new Set((r?.data || []).map((c: any) => c.id))
          if (!cancelled) setLocalInstalled(prev => new Set([...prev, ...ids]))
        }
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [type])

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
        // 用 manifest.name（英文 slug）作为目录名/标识符，与 frontmatter name 保持一致
        const m = item.manifest ?? { name: item.name, description: item.description }
        res = await window.electronAPI?.skill?.installFromMarket?.({ name: m.name, manifest: m })
      } else if (item.type === 'cli') {
        res = await window.electronAPI?.cli?.install?.({
          id: item.id, name: item.name, install_cmd: item.install_cmd, uninstall_cmd: item.uninstall_cmd, bin: item.bin,
        })
      }
      if (!res?.ok) setErrors(e => ({ ...e, [item.id]: res?.error || '安装失败' }))
      else setLocalInstalled(s => new Set(s).add(item.id))
    } catch (e: any) {
      setErrors(er => ({ ...er, [item.id]: e.message }))
    }
    setInstalling('')
  }

  const typeLabel = { mcp: 'MCP Server', skill: 'Skill 包', cli: 'CLI 工具' }[type]

  return (
    <div className="fixed inset-0 bg-ink-400/30 flex items-center justify-center z-50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-dark-50 rounded-md p-6 w-[760px] max-w-[95vw] max-h-[85vh] shadow-2xl shadow-black/50 animate-slideIn flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">扩展市场 — {typeLabel}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-dark-100 rounded-md"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && <p className="text-sm text-dark-500 py-8 text-center">加载中…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-dark-500 py-8 text-center">此分类暂无条目</p>}
          {items.map(item => {
            return (
              <div key={item.id} className="border border-dark-200 rounded-md p-4 hover:border-caramel-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-caramel-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-dark-900">{item.name}</h4>
                      <code className="text-xs text-dark-500 bg-dark-100 px-1.5 py-0.5 rounded">{item.package}</code>
                    </div>
                    <p className="text-sm text-dark-500 mt-1 leading-relaxed">{item.description}</p>
                    {item.requires && item.requires.length > 0 && (
                      <div className="mt-2 px-3 py-1.5 bg-dark-100 border border-dark-200 rounded-lg">
                        <p className="text-xs text-dark-400 leading-relaxed">
                          <span className="font-medium">前置依赖：</span>{item.requires.join(' · ')}
                        </p>
                      </div>
                    )}
                    {item.reason && (
                      <div className="mt-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <p className="text-xs text-orange-400 leading-relaxed">
                          <span className="font-medium">推荐理由：</span>{item.reason}
                        </p>
                      </div>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {item.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-dark-100 text-dark-400">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleInstall(item)}
                    disabled={installing === item.id || localInstalled.has(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm flex-shrink-0 transition-colors ${
                      localInstalled.has(item.id)
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50'
                    }`}
                  >
                    {localInstalled.has(item.id) ? (
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