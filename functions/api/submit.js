import { jsonResponse } from '../utils/auth.js'

const SYSTEM_PROMPT = `你是一个面试题质量审核专家。请分析以下面试问答内容，返回严格 JSON（不要包含 markdown 代码块标记）：

判断标准：
- is_valid: 是否为真实的面试问答（非广告、无意义内容、非面试相关）
- quality_score: 0-100 分（问题清晰度 30% + 答案专业性 40% + 完整性 30%）
- category_id: 1=Agent智能体, 2=RAG检索增强, 3=LLM大模型, 4=Python
- difficulty: 初级/中级/高级
- optimized_question: 优化后的问题标题（简洁明确）
- optimized_dialog: 优化为"面试官-求职者"对话格式，使用 Markdown 排版，格式为 **面试官：** 和 **求职者：** 交替

只返回 JSON，不要其他内容。`

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { question, answer } = body

    if (!question || !answer) {
      return jsonResponse({ error: '问题和答案不能为空' }, 400)
    }

    if (question.length < 5 || answer.length < 20) {
      return jsonResponse({ error: '问题至少5个字符，答案至少20个字符' }, 400)
    }

    // 调用 DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `【问题】${question}\n【答案】${answer}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!deepseekResponse.ok) {
      return jsonResponse({ error: 'AI 处理服务暂时不可用，请稍后重试' }, 503)
    }

    const aiResult = await deepseekResponse.json()
    let content = aiResult.choices?.[0]?.message?.content || ''

    // 清理可能的 markdown 代码块包裹
    content = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '')

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      return jsonResponse({ error: 'AI 返回格式异常，请重试' }, 502)
    }

    const { is_valid, quality_score, category_id, difficulty, optimized_question, optimized_dialog } = parsed

    // 无效内容直接拒绝
    if (!is_valid) {
      return jsonResponse({
        success: false,
        message: '提交的内容不是有效的面试问答，未被收录。',
        quality_score: quality_score || 0,
      })
    }

    // 根据阈值判断状态
    const threshold = parseInt(env.QUALITY_THRESHOLD || '70')
    const status = quality_score >= threshold ? 'approved' : 'pending'

    // 写入数据库
    await env.DB.prepare(
      `INSERT INTO questions (category_id, question, dialog, difficulty, source, status, quality_score)
       VALUES (?, ?, ?, ?, '用户提交', ?, ?)`
    ).bind(
      category_id,
      optimized_question || question,
      optimized_dialog || answer,
      difficulty,
      status,
      quality_score
    ).run()

    return jsonResponse({
      success: true,
      status,
      message: status === 'approved'
        ? '提交成功！已通过审核并上线展示。'
        : '提交成功！质量评分未达自动上线标准，已进入待审核队列。',
      quality_score,
      category_id,
      difficulty,
    })
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
