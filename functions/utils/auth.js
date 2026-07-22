// JWT 工具 - 使用 Web Crypto API (HS256)

function base64UrlEncode(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

async function getHmacKey(secret) {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signJWT(payload, secret, expiresInSec = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec }

  const headerB64 = base64UrlEncode(header)
  const payloadB64 = base64UrlEncode(fullPayload)
  const signingInput = `${headerB64}.${payloadB64}`

  const key = await getHmacKey(secret)
  const enc = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${signingInput}.${sigB64}`
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, sigB64] = parts
    const signingInput = `${headerB64}.${payloadB64}`

    const key = await getHmacKey(secret)
    const enc = new TextEncoder()

    // Decode signature
    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/')
    const sigPadded = sigStr + '='.repeat((4 - sigStr.length % 4) % 4)
    const sigBytes = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0))

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(signingInput))
    if (!valid) return null

    const payload = JSON.parse(base64UrlDecode(payloadB64))

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

// 从请求 Cookie 中提取 JWT
export function getTokenFromCookie(request) {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/)
  return match ? match[1] : null
}

// 验证管理员 JWT，返回 payload 或 null
export async function requireAuth(request, env) {
  const token = getTokenFromCookie(request)
  if (!token) return null
  return verifyJWT(token, env.JWT_SECRET)
}

// 统一 JSON 响应
export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
