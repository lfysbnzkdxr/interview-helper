import { jsonResponse } from '../utils/auth.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const categoryId = url.searchParams.get('category_id')
  const difficulty = url.searchParams.get('difficulty')

  try {
    // 获取分类列表
    const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order').all()

    // 构建查询
    let sql = 'SELECT id, category_id, question, dialog, difficulty, source FROM questions WHERE status = ?'
    const params = ['approved']

    if (categoryId) {
      sql += ' AND category_id = ?'
      params.push(categoryId)
    }
    if (difficulty) {
      sql += ' AND difficulty = ?'
      params.push(difficulty)
    }

    sql += ' ORDER BY id'

    const questions = await env.DB.prepare(sql).bind(...params).all()

    return jsonResponse({
      categories: categories.results,
      questions: questions.results,
    })
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
