import { requireAuth, jsonResponse } from '../utils/auth.js'

export async function onRequestGet(context) {
  const { request, env } = context

  // JWT 认证
  const user = await requireAuth(request, env)
  if (!user) {
    return jsonResponse({ error: '未授权，请先登录' }, 401)
  }

  try {
    const pending = await env.DB.prepare(
      `SELECT q.id, q.category_id, q.question, q.dialog, q.difficulty, q.source, q.quality_score, q.created_at,
              c.display_name as category_name
       FROM questions q
       LEFT JOIN categories c ON q.category_id = c.id
       WHERE q.status = 'pending'
       ORDER BY q.created_at DESC`
    ).all()

    return jsonResponse({ questions: pending.results })
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
