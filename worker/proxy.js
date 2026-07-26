/**
 * 通用 CORS 代理 Worker
 * 模式 1：LLM API 转发（POST / + X-Target-Url + X-Api-Key）
 * 模式 2：通用代理（任意方法 /proxy/<encodedURL>，转发 Authorization 等头）
 * 不存储数据，不记录日志
 *
 * 部署：wrangler deploy worker/proxy.js --name ih-llm-proxy --compatibility-date 2024-01-01
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PROPFIND, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Depth, X-Api-Key, X-Target-Url, X-Api-Format',
}

export default {
  async fetch(request) {
    const url = new URL(request.url)

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // 模式 2：通用代理 /proxy/<encodedURL>
    if (url.pathname.startsWith('/proxy/')) {
      return handleGenericProxy(request, url)
    }

    // 模式 1：LLM API 代理（原有逻辑）
    return handleLLMProxy(request)
  },
}

/**
 * 通用代理：支持任意 HTTP 方法，转发 Authorization / Content-Type / Depth 等头
 */
async function handleGenericProxy(request, url) {
  try {
    const targetUrl = decodeURIComponent(url.pathname.slice('/proxy/'.length))
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 转发关键请求头
    const forwardHeaders = {}
    const auth = request.headers.get('Authorization')
    if (auth) forwardHeaders['Authorization'] = auth
    const contentType = request.headers.get('Content-Type')
    if (contentType) forwardHeaders['Content-Type'] = contentType
    const depth = request.headers.get('Depth')
    if (depth) forwardHeaders['Depth'] = depth

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: request.method === 'GET' || request.method === 'PROPFIND' ? undefined : await request.text(),
    })

    const data = await response.text()
    const respHeaders = { ...corsHeaders }
    const ct = response.headers.get('Content-Type')
    if (ct) respHeaders['Content-Type'] = ct

    return new Response(data, {
      status: response.status,
      headers: respHeaders,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy error: ' + e.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

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
