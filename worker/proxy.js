/**
 * LLM API CORS 代理 Worker
 * 前端通过 X-Target-Url + X-Api-Key 头指定目标 API，由边缘节点转发
 * 解决浏览器 CORS 限制，不存储数据，不记录日志
 *
 * 部署：wrangler deploy worker/proxy.js --name ih-llm-proxy --compatibility-date 2024-01-01
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, X-Target-Url, X-Api-Format',
}

export default {
  async fetch(request) {
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return handleLLMProxy(request)
  },
}

/** 允许转发的 LLM API 域名白名单
 * 同步维护：
 * - src/services/llm.js 的 corsFriendlyHosts
 * - functions/api/llm-proxy.js 的 ALLOWED_HOSTS
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

/**
 * LLM API 代理（原有逻辑）
 */
async function handleLLMProxy(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const apiKey = request.headers.get('X-Api-Key')
    const targetUrl = request.headers.get('X-Target-Url')
    const apiFormat = request.headers.get('X-Api-Format') || 'openai'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing X-Api-Key header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing X-Target-Url header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 安全校验：只允许转发到白名单域名
    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: `Host not allowed: ${parsedUrl.hostname}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await request.text()

    // 根据 API 格式构建不同的认证头
    const forwardHeaders = { 'Content-Type': 'application/json' }
    if (apiFormat === 'anthropic') {
      forwardHeaders['x-api-key'] = apiKey
      forwardHeaders['anthropic-version'] = '2023-06-01'
    } else {
      forwardHeaders['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body,
    })

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy error: ' + e.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
