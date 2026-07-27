/**
 * Cloudflare Pages Function - 云同步接口
 * 路由：/api/sync
 * 
 * GET  /api/sync?code=XXXX  → 下载备份
 * PUT  /api/sync            → 上传备份（body: { code, data }）
 * 
 * 使用 Cloudflare KV 存储，免费额度：10万次读/天、1000次写/天
 */

import { rateLimit, getClientIP } from './_utils.js'

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
 * 校验同步码格式：8位字母数字，或 XXXX-XXXX 带连字符格式
 */
function isValidCode(code) {
  return typeof code === 'string' && /^([A-Za-z0-9]{8}|[A-Za-z0-9]{4}-[A-Za-z0-9]{4})$/.test(code)
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

  const ip = getClientIP(request)

  try {
    // ===== GET：下载备份 =====
    if (request.method === 'GET') {
      // 速率限制：每 IP 每分钟 20 次
      const allowed = await rateLimit(env, `${ip}:sync-get`, 20, 60)
      if (!allowed) {
        return json({ success: false, error: '请求过于频繁，请稍后再试' }, 429)
      }
      const url = new URL(request.url)
      const code = url.searchParams.get('code') || ''

      if (!isValidCode(code)) {
        return json({ success: false, error: '同步码格式无效（需8位字母数字，如 ABCD-EFGH）' }, 400)
      }

      const value = await KV.get(`sync:${code}`)
      if (!value) {
        return json({ success: false, error: '该同步码暂无备份数据' }, 404)
      }

      return json({ success: true, data: JSON.parse(value) })
    }

    // ===== PUT：上传备份 =====
    if (request.method === 'PUT') {
      // 速率限制：每 IP 每小时 5 次（保护 KV 写配额）
      const allowed = await rateLimit(env, `${ip}:sync-put`, 5, 3600)
      if (!allowed) {
        return json({ success: false, error: '上传过于频繁，请稍后再试' }, 429)
      }

      const body = await request.json()
      const { code, data } = body

      if (!isValidCode(code)) {
        return json({ success: false, error: '同步码格式无效（需8位字母数字，如 ABCD-EFGH）' }, 400)
      }

      if (!data || typeof data !== 'object') {
        return json({ success: false, error: '缺少备份数据' }, 400)
      }

      // 数据结构校验：必须包含 questions 数组
      if (!Array.isArray(data.questions)) {
        return json({ success: false, error: '数据格式无效：缺少 questions 数组' }, 400)
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
    return json({ success: false, error: '服务器内部错误' }, 500)
  }
}
