/**
 * Cloudflare Pages Functions 公共工具
 * 提供基于 KV 的简易 IP 级速率限制
 */

/**
 * 固定窗口速率限制
 * @param {object} env - Cloudflare 环境变量（含 SYNC_DATA KV binding）
 * @param {string} key - 限流键（通常为 IP + 端点标识）
 * @param {number} limit - 窗口内允许的最大请求数
 * @param {number} windowSec - 窗口时长（秒）
 * @returns {Promise<boolean>} true=放行，false=超限
 */
export async function rateLimit(env, key, limit, windowSec) {
  const KV = env.SYNC_DATA
  if (!KV) return true // KV 未绑定时不限流（容错）

  const now = Math.floor(Date.now() / 1000)
  const bucketKey = `rl:${key}:${Math.floor(now / windowSec)}`
  const count = parseInt(await KV.get(bucketKey) || '0')
  if (count >= limit) return false
  await KV.put(bucketKey, String(count + 1), { expirationTtl: windowSec * 2 })
  return true
}

/**
 * 获取客户端真实 IP（Cloudflare 边缘注入）
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}
