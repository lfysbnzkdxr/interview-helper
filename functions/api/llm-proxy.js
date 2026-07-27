/**
 * Cloudflare Pages Function - LLM API 内置代理
 * 路由：POST /api/llm-proxy
 * 
 * 前端通过同域请求调用，由边缘节点转发到目标 LLM API
 * 解决浏览器 CORS 限制，用户无需配置任何代理地址
 * 
 * 请求头：
 *   X-Target-Url  - 目标 API 地址
 *   X-Api-Key     - 用户的 API Key
 *   X-Api-Format  - 'openai' | 'anthropic'（默认 openai）
 */

import { rateLimit, getClientIP } from './_utils.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Target-Url, X-Api-Key, X-Api-Format',
}

/** 允许转发的 LLM API 域名白名单
 * 同步维护：
 * - src/services/llm.js 的 corsFriendlyHosts
 * - worker/proxy.js 的 ALLOWED_HOSTS
 * 新增模型时请同时更新以上三处 */
const ALLOWED_HOSTS = [
  'api.deepseek.com',
  'open.bigmodel.cn',
  'api.moonshot.cn',
  'dashscope.aliyuncs.com',
  'api.mimo.xiaomi.com',
  'api.openai.com',
  'api.anthropic.com',
]

export async function onRequest(context) {
  const { request, env } = context

  // 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 速率限制：每 IP 每分钟 10 次
    const ip = getClientIP(request)
    const allowed = await rateLimit(env, `${ip}:llm`, 10, 60)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests, please try again later' }), {
        status: 429,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const targetUrl = request.headers.get('X-Target-Url')
    const apiKey = request.headers.get('X-Api-Key')
    const apiFormat = request.headers.get('X-Api-Format') || 'openai'

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing X-Target-Url header' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing X-Api-Key header' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 安全校验：只允许转发到白名单域名
    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: `Host not allowed: ${parsedUrl.hostname}` }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const body = await request.text()

    // 限制请求体大小（100KB）
    if (body.length > 100 * 1024) {
      return new Response(JSON.stringify({ error: 'Request body too large (max 100KB)' }), {
        status: 413,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 根据 API 格式构建认证头
    const forwardHeaders = { 'Content-Type': 'application/json' }
    if (apiFormat === 'anthropic') {
      forwardHeaders['x-api-key'] = apiKey
      forwardHeaders['anthropic-version'] = '2023-06-01'
    } else {
      forwardHeaders['Authorization'] = `Bearer ${apiKey}`
    }

    // 65 秒超时控制（需大于客户端 60s 超时，避免截断正常响应）
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 65000)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body,
      signal: controller.signal,
    })
    clearTimeout(timer)

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      return new Response(JSON.stringify({ error: '请求超时，请稍后重试' }), {
        status: 504,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Proxy internal error' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}
