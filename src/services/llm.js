import { getDB } from '../stores/db.js'

/**
 * 提供商预设
 * apiFormat: 'openai' = OpenAI 兼容格式 | 'anthropic' = Claude Messages API
 * needsProxy: 不支持浏览器 CORS 的 API 需通过内置代理转发
 */
export const PROVIDER_PRESETS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    apiFormat: 'openai',
    keyPlaceholder: 'sk-...',
    needsProxy: false,
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-5.2', 'glm-5'],
    apiFormat: 'openai',
    keyPlaceholder: 'your-api-key',
    needsProxy: false,
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['kimi-k3', 'kimi-k2.6'],
    apiFormat: 'openai',
    keyPlaceholder: 'sk-...',
    needsProxy: false,
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-plus', 'qwen-turbo'],
    apiFormat: 'openai',
    keyPlaceholder: 'sk-...',
    needsProxy: false,
  },
  {
    id: 'mimo',
    name: 'MiMo (小米)',
    baseUrl: 'https://api.mimo.xiaomi.com/v1/chat/completions',
    models: ['mimo-v2.5-pro'],
    apiFormat: 'openai',
    keyPlaceholder: 'your-api-key',
    needsProxy: true,
  },
]

/** 内置代理地址（Pages Function，同域无 CORS 问题） */
const BUILTIN_PROXY = '/api/llm-proxy'

const OPTIMIZE_PROMPT = `你是一个面试题排版优化专家。请将以下面试问答优化为"面试官-求职者"对话格式。

要求：
- 使用 Markdown 排版
- 格式为 **Q**： 和 **A**： 交替，其中Q为问题，A为答案
- 答案要专业、有条理、适当使用列表和加粗
- 问答都中性表述，不卑不亢
- 判断难度：初级/中级/高级
- 返回严格 JSON（不要包含 markdown 代码块标记）：
  { "optimized_question": "优化后的问题标题", "dialog": "对话内容", "difficulty": "初级|中级|高级" }

只返回 JSON，不要其他内容。`

const GENERATE_PROMPT = `你是一个资深技术面试官和求职者。请根据给定的面试问题，生成一段完整的高质量"面试官-求职者"对话。

要求：
- 使用 Markdown 排版
- 格式为 **Q**： 和 **A**： 交替，2-5 轮对话，其中Q为问题，A为答案
- 答案要专业、有条理、适当使用列表和加粗
- 问答都中性表述，不卑不亢
- 可以包含场景举例
- 判断难度：初级/中级/高级
- 返回严格 JSON（不要包含 markdown 代码块标记）：
  { "optimized_question": "优化后的问题标题", "dialog": "对话内容", "difficulty": "初级|中级|高级" }

只返回 JSON，不要其他内容。`

const POLISH_PROMPT = `你是一个面试题回答润色专家。请润色以下面试问答对话，保持原有 Q/A 交替格式不变。

要求：
- 保持 **Q**： 和 **A**： 交替格式
- 不改变问题原意，可微调措辞使其更清晰
- 优化答案：补充遗漏要点、改善条理性、适当使用列表和加粗
- 问答都中性表述，不卑不亢
- 返回严格 JSON（不要包含 markdown 代码块标记）：
  { "optimized_question": "问题标题", "dialog": "润色后的对话内容", "difficulty": "初级|中级|高级" }

只返回 JSON，不要其他内容。`

const APPEND_PROMPT = `你是一个资深技术面试官和求职者。以下是一段已有的面试问答对话，用户想在其中追加一个新的子问题。请为这个新问题生成高质量回答，并返回更新后的完整对话。

要求：
- 保持 **Q**： 和 **A**： 交替格式
- 如果对话末尾有总结、归纳、小结性质的内容，新问答应插入到该总结之前；否则追加在对话末尾
- 新回答要专业、有条理、适当使用列表和加粗
- 问答都中性表述，不卑不亢
- 返回严格 JSON（不要包含 markdown 代码块标记）：
  { "optimized_question": "问题标题", "dialog": "更新后的完整对话", "difficulty": "初级|中级|高级" }

只返回 JSON，不要其他内容。`

/**
 * 获取多提供商配置
 * 返回 { providers: [...], activeId: string }
 */
async function getConfig() {
  const db = await getDB()
  const setting = await db.get('settings', 'apiConfig')
  return setting?.value || { providers: [], activeId: '' }
}

/**
 * 获取当前激活的提供商配置
 */
async function getActiveProvider() {
  const config = await getConfig()
  if (!config.providers || config.providers.length === 0) {
    throw new Error('请先在设置中添加并配置至少一个 API 提供商')
  }
  const active = config.providers.find(p => p.id === config.activeId)
  if (!active) {
    throw new Error('未选择激活的提供商，请在设置中选择')
  }
  if (!active.apiKey) {
    throw new Error(`请先在设置中为「${active.name}」配置 API Key`)
  }
  return active
}

/**
 * 清理 header 值（去除非 ISO-8859-1 字符、空白符）
 */
function cleanHeader(val) {
  return (val || '').replace(/[^\x20-\x7E]/g, '').trim()
}

/**
 * 判断提供商是否需要走内置代理
 */
function shouldUseProxy(provider) {
  // 预设中有明确标记
  if (provider.needsProxy !== undefined) return provider.needsProxy
  // 自定义提供商：检查是否在已知支持 CORS 的域名列表中
  const corsFriendlyHosts = ['api.deepseek.com', 'open.bigmodel.cn', 'api.moonshot.cn', 'dashscope.aliyuncs.com']
  // 注意：新增域名时请同步更新 functions/api/llm-proxy.js 和 worker/proxy.js 中的 ALLOWED_HOSTS
  try {
    const host = new URL(provider.baseUrl).hostname
    return !corsFriendlyHosts.includes(host)
  } catch {
    return true
  }
}

/**
 * 构建 OpenAI 兼容格式的请求
 */
function buildOpenAIRequest(provider, messages, options = {}) {
  const apiKey = cleanHeader(provider.apiKey)
  const useProxy = shouldUseProxy(provider)
  return {
    url: useProxy ? BUILTIN_PROXY : provider.baseUrl,
    headers: useProxy
      ? { 'Content-Type': 'application/json', 'X-Api-Key': apiKey, 'X-Target-Url': cleanHeader(provider.baseUrl) }
      : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: {
      model: provider.model,
      messages,
      temperature: options.temperature ?? provider.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
    },
  }
}

/**
 * 构建 Anthropic (Claude) 格式的请求
 */
function buildAnthropicRequest(provider, systemPrompt, userContent, options = {}) {
  const apiKey = cleanHeader(provider.apiKey)
  const useProxy = shouldUseProxy(provider)
  return {
    url: useProxy ? BUILTIN_PROXY : provider.baseUrl,
    headers: useProxy
      ? { 'Content-Type': 'application/json', 'X-Api-Key': apiKey, 'X-Target-Url': cleanHeader(provider.baseUrl), 'X-Api-Format': 'anthropic' }
      : { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: {
      model: provider.model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      temperature: options.temperature ?? provider.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
    },
  }
}

/**
 * 解析响应内容（兼容两种格式）
 */
function parseResponse(data, apiFormat) {
  if (apiFormat === 'anthropic') {
    return data.content?.[0]?.text || ''
  }
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 从 AI 返回文本中提取 JSON 对象
 * 兼容：纯 JSON、```json 包裹、前后有多余文本等情况
 */
function extractJSON(content) {
  // 1. 先尝试直接解析
  try { return JSON.parse(content) } catch { /* continue */ }

  // 2. 提取 markdown 代码块中的内容
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]) } catch { /* continue */ }
  }

  // 3. 截取第一个 { 到最后一个 } 之间的内容
  const firstBrace = content.indexOf('{')
  const lastBrace = content.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = content.slice(firstBrace, lastBrace + 1)
    try { return JSON.parse(jsonStr) } catch { /* continue */ }
  }

  return null
}

/**
 * 统一 LLM 调用入口
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userContent - 用户内容
 * @param {{ timeout?: number, maxTokens?: number, temperature?: number }} options
 * @returns {Promise<import('../types.js').LLMResult>}
 */
async function callLLM(systemPrompt, userContent, options = {}) {
  const provider = await getActiveProvider()

  let req
  if (provider.apiFormat === 'anthropic') {
    req = buildAnthropicRequest(provider, systemPrompt, userContent, options)
  } else {
    req = buildOpenAIRequest(provider, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], options)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 60000)

  let response
  try {
    response = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') throw new Error('AI 请求超时（60秒），请检查网络后重试')
    throw new Error('网络连接失败: ' + e.message)
  }
  clearTimeout(timeout)

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`API 请求失败 (${response.status}): ${errText.slice(0, 200) || '未知错误'}`)
  }

  const data = await response.json()
  const content = parseResponse(data, provider.apiFormat)
  const result = extractJSON(content)
  if (!result) throw new Error('AI 返回格式异常，请重试')
  return result
}

/**
 * 带自动重试的 LLM 调用
 * 网络/超时错误自动重试 1 次（延迟 2s），API 业务错误不重试
 */
async function callLLMWithRetry(systemPrompt, userContent, options = {}) {
  try {
    return await callLLM(systemPrompt, userContent, options)
  } catch (e) {
    if (e.message.includes('超时') || e.message.includes('网络连接失败')) {
      await new Promise(r => setTimeout(r, 2000))
      return await callLLM(systemPrompt, userContent, options)
    }
    throw e
  }
}

/**
 * 调用 LLM 优化面试问答
 * @param {string} question - 面试问题
 * @param {string} answer - 答案要点
 * @returns {Promise<import('../types.js').LLMResult>}
 */
export const optimizeQA = (question, answer) =>
  callLLMWithRetry(OPTIMIZE_PROMPT, `【问题】${question}\n【答案】${answer}`)

/**
 * 调用 LLM 根据问题自动生成完整对话
 * @param {string} question - 面试问题
 * @returns {Promise<import('../types.js').LLMResult>}
 */
export const generateQA = (question) =>
  callLLMWithRetry(GENERATE_PROMPT, `【问题】${question}`)

/**
 * 调用 LLM 润色现有对话
 * @param {string} question - 问题标题
 * @param {string} dialog - 现有对话内容
 * @returns {Promise<import('../types.js').LLMResult>}
 */
export const polishDialog = (question, dialog) =>
  callLLMWithRetry(POLISH_PROMPT, `【问题】${question}\n【现有对话】${dialog}`, { maxTokens: 4000 })

/**
 * 调用 LLM 为新增子问题生成回答并追加到对话
 * @param {string} question - 主题问题
 * @param {string} existingDialog - 现有对话内容
 * @param {string} newSubQuestion - 新增子问题
 * @returns {Promise<import('../types.js').LLMResult>}
 */
export const appendSubQA = (question, existingDialog, newSubQuestion) =>
  callLLMWithRetry(APPEND_PROMPT, `【主题】${question}\n【现有对话】${existingDialog}\n【新增子问题】${newSubQuestion}`, { maxTokens: 4000 })

/**
 * 测试指定提供商的连接
 * @param {import('../types.js').ApiProvider} [providerConfig] - 提供商配置，缺省用当前激活的
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function testConnection(providerConfig) {
  try {
    let provider
    if (providerConfig) {
      provider = providerConfig
    } else {
      provider = await getActiveProvider()
    }

    if (!provider.apiKey) {
      return { success: false, error: '未配置 API Key' }
    }

    let req
    if (provider.apiFormat === 'anthropic') {
      req = buildAnthropicRequest(provider, '回复"连接成功"', '测试', { maxTokens: 10 })
    } else {
      req = buildOpenAIRequest(provider, [{ role: 'user', content: '回复"连接成功"' }], { maxTokens: 10 })
    }

    // 15秒超时
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (response.ok) {
      return { success: true }
    } else {
      const errText = await response.text().catch(() => '')
      return { success: false, error: `HTTP ${response.status}: ${errText.slice(0, 100)}` }
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, error: '连接超时（15秒），请检查网络或 API 地址' }
    }
    return { success: false, error: e.message }
  }
}
