// v2 引擎入口：基于 @earendil-works/pi-agent-core 的 Agent 类
// - 提供 runAgentLoopV2() 与 v1 runAgentLoop 形状兼容
// - 内置图式循环（最多 2 轮）：执行 → 校验 → 重规划
// - 校验复用 v1 的 verifyExecution LLM 调用（让 v1 v2 行为一致）

import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core'
import type { AssistantMessage, ToolResultMessage, ToolCall } from '@earendil-works/pi-ai'
import type { TaskStep, PlanResult } from '../agent'
import { buildAllTools } from './tools'
import { buildDeepSeekModel, createDeepSeekStreamFn } from './provider'
import { chatMessagesToAgentMessages } from './persist'
import type { ToolContext, V2AgentLoopOutcome, V2ExecutionResult, V2ExecutionStep } from './types'
import { Type, type Static } from '@earendil-works/pi-ai'
import { defineTool, safeJsonText } from './tools/base'

const MAX_LOOP_ROUNDS = 2

// 兜底 plan：失败路径或消息为空时使用
function emptyPlan(userInput: string): PlanResult {
  return {
    task: userInput,
    thought: '任务执行遇到错误',
    steps: [],
    needsExecution: true,
  }
}

// 把工具结果 details 还原为"扁平步骤"（兼容 v1 UI 展示）
function extractToolResult(msg: ToolResultMessage): { tool: string; input: any; output?: any; error?: string } {
  const firstText = (msg.content as any[])?.find((c: any) => c.type === 'text')?.text
  const detail = msg.details as any
  let input: any = undefined
  let output: any = undefined
  let error: string | undefined = undefined
  if (msg.isError) {
    error = firstText ?? '工具执行错误'
  } else {
    output = detail ?? firstText
  }
  return { tool: msg.toolName, input, output, error }
}

// 把 MCP 工具列表（来自主进程）转换为 Pi 的 AgentTool
// 简化策略：MCP 工具的 inputSchema 是 JSON Schema（Pi 用 TypeBox）
// 我们动态构造一个 Type.Object(properties)，属性 schema 透传
function jsonSchemaToTypeBox(schema: any): any {
  if (!schema || typeof schema !== 'object') return Type.Object({})
  if (schema.type !== 'object' || !schema.properties) return Type.Object({})
  const props: Record<string, any> = {}
  const required = new Set<string>(schema.required || [])
  for (const [key, def] of Object.entries(schema.properties as Record<string, any>)) {
    let t: any = Type.String()
    if (def.type === 'number' || def.type === 'integer') t = Type.Number()
    else if (def.type === 'boolean') t = Type.Boolean()
    else if (def.type === 'array') t = Type.Array(Type.String())
    if (def.description) t = t({ description: def.description })
    if (!required.has(key)) t = Type.Optional(t)
    props[key] = t
  }
  return Type.Object(props)
}

async function loadMcpToolsForV2(): Promise<any[]> {
  try {
    const mcpList = await (window.electronAPI as any)?.mcp?.listTools?.()
    if (!Array.isArray(mcpList)) return []
    const out: any[] = []
    for (const t of mcpList) {
      // 工具名形如 mcp__<serverId>__<toolName>
      // 解析 serverId 与原名以便后续路由
      const m = t.name.match(/^mcp__(.+?)__(.+)$/)
      if (!m) continue
      const [, serverId, origName] = m
      const toolCtx: ToolContext | null = null // 暂未用到
      const dummyCtx = ({} as any) // MCP 工具不依赖 ToolContext
      const schema = jsonSchemaToTypeBox(t.inputSchema)
      const agentTool = defineTool(dummyCtx, {
        name: t.name,
        label: origName,
        description: t.description || origName,
        parameters: schema,
        execute: async (_c, params) => {
          try {
            const r = await (window.electronAPI as any).mcp.callTool(serverId, origName, params)
            // r.content 是 [{ type: 'text', text: ... }, ...]
            const text = Array.isArray((r as any)?.content)
              ? (r as any).content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
              : safeJsonText(r)
            return { content: [{ type: 'text', text: text || '(空)' }], details: r }
          } catch (e: any) {
            return { content: [{ type: 'text', text: `MCP 错误: ${e.message}` }], details: { error: e.message } }
          }
        },
      })
      out.push(agentTool)
    }
    return out
  } catch { return [] }
}

// 从 messages 序列中提取"扁平步骤"
function flattenSteps(messages: AgentMessage[]): V2ExecutionStep[] {
  const steps: V2ExecutionStep[] = []
  for (const m of messages) {
    if ((m as any).role !== 'toolResult') continue
    const tr = m as ToolResultMessage
    const detail = extractToolResult(tr)
    // 找到对应的 assistant 消息里的 ToolCall，拿 arguments
    const assistant = messages.find(prev =>
      prev.role === 'assistant' &&
      Array.isArray((prev as AssistantMessage).content) &&
      (prev as AssistantMessage).content.some((c: any) => c.type === 'toolCall' && c.id === tr.toolCallId)
    ) as AssistantMessage | undefined
    if (assistant) {
      const tc = (assistant.content as any[]).find(c => c.type === 'toolCall' && c.id === tr.toolCallId) as ToolCall | undefined
      if (tc) detail.input = tc.arguments
    }
    steps.push(detail)
  }
  return steps
}

function messagesSuccess(messages: AgentMessage[]): boolean {
  return messages.some(m => (m as any).role === 'toolResult' && !(m as ToolResultMessage).isError)
    || messages.some(m => m.role === 'assistant' && (m as AssistantMessage).stopReason === 'toolUse')
}

// 校验节点：复用 v1 思路（用 LLM 判定执行结果是否达标）
// 这里直接走原始 DeepSeek API（与 v1 verifyExecution 一致，避免两版行为分裂）
async function verifyExecutionV2(
  userInput: string,
  steps: V2ExecutionStep[],
  apiKey: string
): Promise<{ passed: boolean; feedback: string }> {
  if (steps.length === 0) return { passed: true, feedback: '' }
  const failed = steps.find(s => s.error)
  if (failed) return { passed: false, feedback: `步骤 ${failed.tool} 执行失败: ${failed.error}` }

  const stepsText = steps.map((s, i) => {
    const out = s.output !== undefined ? JSON.stringify(s.output).slice(0, 300) : '(无输出)'
    return `步骤${i + 1} ${s.tool}: ${out}`
  }).join('\n')

  const prompt = `你是AI WorkHub的执行结果校验员。判断以下工具执行结果是否真正满足了用户的需求。

用户请求: "${userInput}"

实际执行结果:
${stepsText}

判定标准:
- 通过(passed=true): 结果已满足用户需求；或结果合理但确实没有更好的做法（如搜索确实无结果但已正确报告）
- 不通过(passed=false): 结果与需求不符、关键信息缺失、参数错误、或者明显存在更好的策略。feedback 用一句话写清楚哪里不行、该怎么改进

只返回JSON: {"passed": true或false, "feedback": "说明"}`

  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是执行结果校验员，严格但务实：结果达标就通过。只输出JSON。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    })
    const data = await r.json()
    if (!r.ok || !data.choices?.[0]) throw new Error(`DeepSeek API 错误: ${data?.error?.message || r.status}`)
    let content = data.choices[0].message.content || ''
    const m = content.match(/\{[\s\S]*\}/)
    if (m) content = m[0]
    const result = JSON.parse(content)
    return { passed: result.passed !== false, feedback: typeof result.feedback === 'string' ? result.feedback : '' }
  } catch (e) {
    // fail-open：校验失败不阻塞
    return { passed: true, feedback: '' }
  }
}

// ===== 公共 API =====
export async function runAgentLoopV2(
  userInput: string,
  apiKey: string,
  chatMessages: Array<{ role: string; content: string }> = [],
  toolCtx: ToolContext
): Promise<V2AgentLoopOutcome> {
  // 把聊天历史转为 Pi 的消息格式（注入当前用户消息）
  const initialMessages = chatMessagesToAgentMessages(chatMessages, userInput)
  // 注入长期记忆
  let memorySection = ''
  try {
    const mem = await toolCtx.dbQuery("SELECT * FROM memories ORDER BY created_at DESC LIMIT 5")
    const items = (mem.data || []) as Array<{ content: string }>
    if (items.length > 0) {
      memorySection = `\n\n用户长期记忆（参考）:\n${items.map(m => `- ${m.content}`).join('\n')}`
    }
  } catch { /* ignore */ }

  // 加载 Skills（v2 引擎独有）
  let skillsSection = ''
  try {
    const skills = await (window.electronAPI as any)?.skill?.list?.()
    if (Array.isArray(skills) && skills.length > 0) {
      skillsSection = `\n\n可用 Skills（识别用户意图后调用对应 skill 名称）:\n${skills.map((s: any) => `- **${s.name}**: ${s.description}`).join('\n')}`
    }
  } catch { /* 主进程没装 Skill IPC 时忽略 */ }

  // 加载 MCP 工具（v2 引擎独有）
  const mcpTools = await loadMcpToolsForV2()

  const streamFn = createDeepSeekStreamFn(apiKey)
  const tools = buildAllTools(toolCtx)
  tools.push(...mcpTools)
  // 稳定排序，喂 prefix cache
  tools.sort((a, b) => a.name.localeCompare(b.name))

  const systemPrompt = `你是AI WorkHub的智能助手，一个专业的桌面办公伙伴。拥有工具执行能力，需要时调用工具；纯聊天/问候/闲聊时直接自然回复。` + memorySection + skillsSection

  const agent = new Agent({
    streamFn,
    initialState: {
      systemPrompt,
      model: buildDeepSeekModel('deepseek-chat'),
      thinkingLevel: 'off',
      tools,
      messages: initialMessages,
    },
  })

  // 收集事件
  const allMessages: AgentMessage[] = [...initialMessages]
  const collectedSteps: V2ExecutionStep[] = []
  let lastError: string | undefined

  agent.subscribe(async (event) => {
    if (event.type === 'turn_end') {
      // 收集 assistant 消息
      if (event.message) allMessages.push(event.message)
      // 收集工具结果
      for (const tr of event.toolResults || []) {
        allMessages.push(tr)
        const detail = extractToolResult(tr)
        // 找参数
        const tc = (event.message as AssistantMessage)?.content?.find((c: any) => c.type === 'toolCall' && c.id === tr.toolCallId) as ToolCall | undefined
        if (tc) detail.input = tc.arguments
        collectedSteps.push(detail)
      }
    } else if (event.type === 'message_end') {
      // 单独 message_end 一般是流式结束的 assistant 文本，turn_end 已涵盖
    } else if (event.type === 'agent_end') {
      // 最终消息序列
    }
  })

  // 第一轮
  try {
    await agent.prompt(userInput)
  } catch (e: any) {
    return {
      needsExecution: true,
      plan: emptyPlan(userInput),
      messages: allMessages,
      steps: collectedSteps,
      execResult: {
        success: false,
        steps: collectedSteps,
        finalResult: e.message,
      },
      rounds: 1,
      feedbacks: [`启动失败: ${e.message}`],
    }
  }

  // 图式循环：最多 2 轮
  const feedbacks: string[] = []
  let rounds = 1
  if (collectedSteps.length > 0) {
    for (let r = 1; r < MAX_LOOP_ROUNDS; r++) {
      const verify = await verifyExecutionV2(userInput, collectedSteps, apiKey)
      if (verify.passed) break
      feedbacks.push(verify.feedback || '执行结果未满足需求')
      // 重规划：把反馈作为 steering message 注入
      agent.steer({
        role: 'user',
        content: `上轮执行反馈：${verify.feedback}\n请据此重新规划或调整策略。`,
        timestamp: Date.now(),
      } as any)
      try {
        await agent.continue()
        rounds++
      } catch (e: any) {
        lastError = e.message
        break
      }
    }
  }

  // 判定 needsExecution：执行过任何工具视为 true
  const executed = collectedSteps.length > 0 || messagesSuccess(allMessages)
  if (!executed) return { needsExecution: false }

  // 构造兼容 v1 的 plan 视图：从 messages 里取最后一个 assistant 文本作为 thought，steps 来自 collectedSteps
  const lastAssistant = [...allMessages].reverse().find(m => m.role === 'assistant') as AssistantMessage | undefined
  const thoughtText = lastAssistant
    ? (lastAssistant.content as any[]).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim() || '任务执行完成'
    : '任务执行完成'
  const planForUi = {
    task: userInput,
    thought: thoughtText,
    steps: collectedSteps.map((s, i): TaskStep => ({
      id: i + 1,
      description: s.tool,
      tool: s.tool,
      params: s.input || {},
      status: s.error ? 'failed' as const : 'completed' as const,
      result: s.output,
      error: s.error,
    })),
    needsExecution: true,
  }

  return {
    needsExecution: true,
    plan: planForUi,
    messages: allMessages,
    steps: collectedSteps,
    execResult: {
      success: collectedSteps.every(s => !s.error),
      steps: collectedSteps,
      finalResult: collectedSteps.length > 0 ? `已完成 ${collectedSteps.length} 个步骤` : '执行完成',
    },
    rounds,
    feedbacks,
  }
}