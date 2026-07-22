import { requireAuth, jsonResponse } from '../utils/auth.js'

export async function onRequestPost(context) {
  const { request, env } = context

  // JWT 认证
  const user = await requireAuth(request, env)
  if (!user) {
    return jsonResponse({ error: '未授权，请先登录' }, 401)
  }

  try {
    const body = await request.json()
    const { id, action } = body

    if (!id || !['approve', 'reject'].includes(action)) {
      return jsonResponse({ error: '参数无效：需要 id 和 action (approve/reject)' }, 400)
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const result = await env.DB.prepare(
      'UPDATE questions SET status = ? WHERE id = ? AND status = ?'
    ).bind(newStatus, id, 'pending').run()

    if (result.meta.changes === 0) {
      return jsonResponse({ error: '未找到对应的待审核题目' }, 404)
    }

    return jsonResponse({
      success: true,
      message: action === 'approve' ? '已通过审核' : '已拒绝',
    })
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
