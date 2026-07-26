/**
 * 云同步服务 - 基于 Cloudflare KV
 * 通过同域 /api/sync 接口实现跨设备数据迁移
 * 同步码为临时凭证，支持 10分钟 / 24小时 自动过期
 */

const API_BASE = '/api/sync'

/**
 * 生成随机迁移码（8位，大写字母+数字，易读）
 */
export function generateSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆的 I/O/0/1
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  // 格式：XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/**
 * 生成同步链接（用于手机扫码/打开）
 */
export function getSyncLink(code) {
  const base = window.location.origin
  return `${base}/settings#sync=${code}`
}

/**
 * 从 URL hash 解析同步码（#sync=XXXX-XXXX）
 * @returns {string|null}
 */
export function parseSyncCodeFromHash() {
  const hash = window.location.hash
  const match = hash.match(/sync=([A-Za-z0-9_-]{4,32})/)
  if (match) {
    // 清除 hash，避免刷新重复触发
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return match[1].toUpperCase()
  }
  return null
}

/**
 * 上传备份数据到云端
 * @param {string} code - 迁移码
 * @param {object} data - 备份数据 { categories, questions }
 * @param {number} ttl - 过期秒数（600 | 86400）
 * @returns {Promise<{success: boolean, syncedAt?: string, expiresIn?: number, error?: string}>}
 */
export async function uploadBackup(code, data, ttl = 86400) {
  try {
    const res = await fetch(API_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, data, ttl }),
    })
    const result = await res.json()
    return result
  } catch (e) {
    return { success: false, error: '网络请求失败: ' + e.message }
  }
}

/**
 * 从云端下载备份数据
 * @param {string} code - 迁移码
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function downloadBackup(code) {
  try {
    const res = await fetch(`${API_BASE}?code=${encodeURIComponent(code)}`)
    const result = await res.json()
    return result
  } catch (e) {
    return { success: false, error: '网络请求失败: ' + e.message }
  }
}
