// ExtensionStatusBar：AI 伙伴面板顶部的"扩展可用性"常驻条
// 让用户一眼看到：当前 session 加载了多少 MCP 工具 / 几个 Skill / 几个 CLI 可用 / 当前引擎
// v1 时显示"扩展市场仅 v2 可用"提示

import { Server, Brain, Terminal, Cpu, ChevronRight } from 'lucide-react'

interface Props {
  engineVersion: 'v1' | 'v2'
  mcpToolCount: number      // 已启动 MCP 提供的工具数（v2 才有意义）
  skillCount: number
  cliCount: number          // 已安装 CLI 数
  onClick?: () => void      // 点击跳转去设置/扩展抽屉
}

export default function ExtensionStatusBar({ engineVersion, mcpToolCount, skillCount, cliCount, onClick }: Props) {
  const isV2 = engineVersion === 'v2'
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 bg-gradient-to-r from-studio-50 to-white border-b border-studio-200 hover:from-studio-100 transition-colors flex items-center gap-2 text-xs"
    >
      <Cpu size={14} className={isV2 ? 'text-caramel-500' : 'text-studio-400'} />
      <span className={`font-medium ${isV2 ? 'text-ink-100' : 'text-studio-500'}`}>引擎 {engineVersion}</span>
      {isV2 ? (
        <>
          <span className="text-studio-300">·</span>
          <span className="flex items-center gap-1 text-studio-600">
            <Server size={12} className="text-studio-500" />
            <span className="font-mono">{mcpToolCount}</span>
            <span className="text-studio-400">工具</span>
          </span>
          <span className="text-studio-300">·</span>
          <span className="flex items-center gap-1 text-studio-600">
            <Brain size={12} className="text-studio-500" />
            <span className="font-mono">{skillCount}</span>
            <span className="text-studio-400">skills</span>
          </span>
          <span className="text-studio-300">·</span>
          <span className="flex items-center gap-1 text-studio-600">
            <Terminal size={12} className="text-studio-500" />
            <span className="font-mono">{cliCount}</span>
            <span className="text-studio-400">CLI</span>
          </span>
        </>
      ) : (
        <span className="text-studio-400 ml-1">扩展市场仅在 v2 可用</span>
      )}
      <ChevronRight size={12} className="ml-auto text-studio-400" />
    </button>
  )
}