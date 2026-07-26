/**
 * 通用 CORS 代理 Worker
 * 支持转发到任意 LLM API（DeepSeek / OpenAI / Claude / GLM / Kimi 等）
 * 不存储数据，不记录日志
 *
 * 客户端通过 X-Target-Url 指定目标 API 地址
 * 通过 X-Api-Key 传递用户的 API Key
 * 通过 X-Api-Format 指定 API 格式（openai | anthropic）
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
  },
}
