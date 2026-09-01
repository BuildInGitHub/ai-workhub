// Marketplace 客户端：先尝试远端 GitHub raw，拉失败 fallback 内嵌种子
// 市场 JSON 形态见 electron/marketplace-seed.json

import seed from '../../electron/marketplace-seed.json'

export type ItemType = 'mcp' | 'skill' | 'cli'

export interface MarketItem {
  id: string
  type: ItemType
  name: string
  package: string
  description: string
  // MCP 字段
  command?: string
  args?: string[]
  env?: Record<string, string>
  // Skill 字段
  manifest?: { name: string; description: string }
  // CLI 字段
  install_cmd?: string
  uninstall_cmd?: string
  bin?: string
  tags?: string[]
}

interface MarketIndex {
  version: number
  updated_at: string
  servers: MarketItem[]
}

const REMOTE_URL = 'https://raw.githubusercontent.com/BuildInGitHub/ai-workhub-marketplace/main/index.json'
const TIMEOUT_MS = 5000

// 通过 IPC 拿远端 JSON（主进程跑 fetch 避免 renderer CORS）
export async function fetchMarket(): Promise<{ items: MarketItem[]; source: 'remote' | 'local'; error?: string }> {
  // 优先 IPC（主进程 fetch，无 CORS 限制）
  try {
    const remote = await window.electronAPI?.market?.fetch?.()
    if (remote && remote.items && remote.items.length > 0) {
      return { items: remote.items as MarketItem[], source: 'remote' }
    }
    if (remote && remote.error) {
      // fallback 种子
      return { items: (seed as MarketIndex).servers, source: 'local', error: remote.error }
    }
  } catch { /* ignore */ }
  return { items: (seed as MarketIndex).servers, source: 'local' }
}

export function filterByType(items: MarketItem[], type: ItemType): MarketItem[] {
  return items.filter(i => i.type === type)
}

export const TIMEOUT_MARKET_FETCH = TIMEOUT_MS