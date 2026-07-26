/**
 * Cloudflare Pages Function - 云同步接口
 * 路由：/api/sync
 * 
 * GET  /api/sync?code=XXXX  → 下载备份
 * PUT  /api/sync            → 上传备份（body: { code, data }）
 * 
 * 使用 Cloudflare KV 存储，免费额度：10万次读/天、1000次写/天
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/**
 * 校验同步码格式：4-32位字母数字
 */
function isValidCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9_-]{4,32}$/.test(code)
}

export async function onRequest(context) {
  const { request, env } = context

  // 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const KV = env.SYNC_DATA
  if (!KV) {
    return json({ success: false, error: '服务未配置存储' }, 500)
  }

  try {
    // ===== GET：下载备份 =====
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const code = url.searchParams.get('code') || ''

      if (!isValidCode(code)) {
        return json({ success: false, error: '同步码格式无效（需4-32位字母数字）' }, 400)
      }

      const value = await KV.get(`sync:${code}`)
      if (!value) {
        return json({ success: false, error: '该同步码暂无备份数据' }, 404)
      }

      return json({ success: true, data: JSON.parse(value) })
    }

    // ===== PUT：上传备份 =====
    if (request.method === 'PUT') {
      const body = await request.json()
      const { code, data } = body

      if (!isValidCode(code)) {
        return json({ success: false, error: '同步码格式无效（需4-32位字母数字）' }, 400)
      }

      if (!data || typeof data !== 'object') {
        return json({ success: false, error: '缺少备份数据' }, 400)
      }

      // 限制数据大小（约 500KB）
      const serialized = JSON.stringify(data)
      if (serialized.length > 512 * 1024) {
        return json({ success: false, error: '数据过大（上限 512KB）' }, 413)
      }

      // 过期时间：仅允许 10分钟 或 24小时，默认 24小时
      const allowedTTLs = [600, 86400]
      const ttl = allowedTTLs.includes(body.ttl) ? body.ttl : 86400

      await KV.put(`sync:${code}`, serialized, { expirationTtl: ttl })

      return json({ success: true, syncedAt: new Date().toISOString(), expiresIn: ttl })
    }

    return json({ success: false, error: '不支持的请求方法' }, 405)
  } catch (e) {
    return json({ success: false, error: '服务器内部错误: ' + e.message }, 500)
  }
}
