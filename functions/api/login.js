import { signJWT, jsonResponse } from '../utils/auth.js'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'

    // 检查是否被锁定（15分钟内失败次数）
    const lockoutCheck = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE ip = ? AND attempted_at > datetime('now', '-' || ? || ' minutes')`
    ).bind(ip, LOCKOUT_MINUTES).first()

    if (lockoutCheck && lockoutCheck.count >= MAX_ATTEMPTS) {
      return jsonResponse({ error: `登录失败次数过多，请 ${LOCKOUT_MINUTES} 分钟后重试` }, 429)
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return jsonResponse({ error: '用户名和密码不能为空' }, 400)
    }

    // 验证用户名
    if (username !== env.ADMIN_USERNAME) {
      await recordFailedAttempt(env, ip)
      return jsonResponse({ error: '用户名或密码错误' }, 401)
    }

    // 验证密码（使用 SHA-256 哈希比对）
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (passwordHash !== env.ADMIN_PASSWORD_HASH) {
      await recordFailedAttempt(env, ip)
      return jsonResponse({ error: '用户名或密码错误' }, 401)
    }

    // 登录成功，清除该 IP 的失败记录
    await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()

    // 签发 JWT
    const token = await signJWT({ sub: username, role: 'admin' }, env.JWT_SECRET, 86400)

    return jsonResponse(
      { success: true, message: '登录成功' },
      200,
      {
        'Set-Cookie': `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
      }
    )
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

async function recordFailedAttempt(env, ip) {
  await env.DB.prepare(
    'INSERT INTO login_attempts (ip) VALUES (?)'
  ).bind(ip).run()
}
