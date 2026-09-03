// ExtensionStatusBar：AI 伙伴面板顶部的"扩展可用性"终端命令栏
// Grok 风格：等宽字、深色底、▍ READY 终端标识

import { Terminal } from 'lucide-react'

interface Props {
  engineVersion: 'v1' | 'v2'
  mcpToolCount: number
  skillCount: number
  cliCount: number
  onClick?: () => void
}

export default function ExtensionStatusBar({ engineVersion, mcpToolCount, skillCount, cliCount, onClick }: Props) {
  const isV2 = engineVersion === 'v2'
  const total = isV2 ? mcpToolCount + skillCount + cliCount : 0
  const ready = isV2 ? total > 0 : true
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 bg-dark-50 hover:bg-dark-100 border-b border-dark-200 transition-colors flex items-center gap-2 text-[11px] font-mono"
    >
      <Terminal size={11} className={isV2 ? 'text-orange-500' : 'text-dark-500'} />
      <span className={`font-mono font-medium ${isV2 ? 'text-orange-500' : 'text-dark-500'}`}>[engine]</span>
      <span className={`font-mono ${isV2 ? 'text-dark-900' : 'text-dark-500'}`}>{engineVersion}</span>
      <span className="text-dark-300 font-mono">·</span>
      <span className="text-dark-500 font-mono">[mcp]</span>
      <span className={`font-mono ${mcpToolCount > 0 ? 'text-dark-900' : 'text-dark-400'}`}>{mcpToolCount}</span>
      <span className="text-dark-500 font-mono">[skills]</span>
      <span className={`font-mono ${skillCount > 0 ? 'text-dark-900' : 'text-dark-400'}`}>{skillCount}</span>
      <span className="text-dark-500 font-mono">[cli]</span>
      <span className={`font-mono ${cliCount > 0 ? 'text-dark-900' : 'text-dark-400'}`}>{cliCount}</span>
      <span className="ml-auto flex items-center gap-1 font-mono">
        <span className="text-dark-500">▍</span>
        <span className={ready ? 'text-green-500' : 'text-dark-500'}>{ready ? 'READY' : (isV2 ? 'idle' : 'read-only')}</span>
      </span>
    </button>
  )
}