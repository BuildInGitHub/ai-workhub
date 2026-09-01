// v2 DeepSeek Provider 适配层
// 仿 dscode deepseek.ts：保留 Pi 的 openai-completions 实现，但针对 DeepSeek API 裁剪 payload
// - 关闭 DeepSeek 不支持或自动处理的字段（prompt_cache_key 等）
// - 设置稳定工具顺序吃 DeepSeek 前缀缓存
// - 注入 ApiKey（从 settings 表 deepseek_api_key 读取，运行时由调用方传入）

import type { Model, Context, AssistantMessageEventStream } from '@earendil-works/pi-ai'
import type { StreamFn } from '@earendil-works/pi-agent-core'
import { getApiProvider, streamSimple as compatStreamSimple } from '@earendil-works/pi-ai/compat'

// 自定义一个针对 deepseek-chat 的 Model 对象（Pi 目录里没有 deepseek-chat，只有 V4）
// 直接走 openai-completions 协议 + DeepSeek baseUrl，关闭 Pi 不必要的功能
export function buildDeepSeekModel(modelId: string = 'deepseek-chat'): Model<'openai-completions'> {
  return {
    id: modelId,
    name: modelId === 'deepseek-chat' ? 'DeepSeek Chat' : modelId,
    api: 'openai-completions',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    reasoning: false,                 // deepseek-chat 不走 reasoning
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 64000,
    maxTokens: 8192,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      requiresReasoningContentOnAssistantMessages: false,
      // DeepSeek 自动前缀缓存，不需要 prompt_cache_key
      supportsUsageInStreaming: true,
    },
  }
}

// 提供给 Agent 的 streamFn：包装兼容层，注入 API key，按需裁剪 payload
export function createDeepSeekStreamFn(apiKey: string, modelId?: string): StreamFn {
  const apiProvider = getApiProvider('openai-completions')
  if (!apiProvider) {
    throw new Error('openai-completions provider not registered in @earendil-works/pi-ai')
  }

  return async (m, context, options) => {
    const opts = (options ?? {}) as any
    // DeepSeek payload 裁剪：去掉 Pi 默认带但 DeepSeek 会忽略/拒绝的字段
    const originalOnPayload = opts.onPayload
    const wrappedOptions = {
      ...opts,
      apiKey,
      onPayload: (payload: unknown) => {
        originalOnPayload?.(payload)
        scrubDeepSeekPayload(payload)
      },
    }
    return apiProvider.streamSimple(m as any, context, wrappedOptions)
  }
}

// 裁剪 DeepSeek 不需要的 payload 字段
// 关键原则：DeepSeek 自动管理前缀缓存，所以 prompt_cache_key 等是无用的
function scrubDeepSeekPayload(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return
  const p = payload as Record<string, any>
  // 删除 prompt cache 相关字段（DeepSeek 自动前缀缓存）
  delete p.prompt_cache_key
  delete p.prompt_cache_retention
  delete p.prompt_cache_options
  delete p.include
  // 如果有 reasoning 而 reasoning.effort 不为空，删掉 temperature/top_p（被 thinking 覆盖）
  if (p.reasoning && typeof p.reasoning === 'object') {
    p.reasoning = { effort: p.reasoning.effort }
    delete p.temperature
    delete p.top_p
  }
}

// 工具列表稳定性：调用方传入的工具按 name 排序，让 DeepSeek 前缀缓存命中率最大化
export function stableSortTools<T extends { name: string }>(tools: T[]): T[] {
  return [...tools].sort((a, b) => a.name.localeCompare(b.name))
}