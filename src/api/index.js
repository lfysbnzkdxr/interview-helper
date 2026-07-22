const BASE = ''

export async function fetchQuestions({ categoryId, difficulty } = {}) {
  const params = new URLSearchParams()
  if (categoryId) params.set('category_id', categoryId)
  if (difficulty) params.set('difficulty', difficulty)
  const qs = params.toString()
  const res = await fetch(`${BASE}/api/questions${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('获取题目失败')
  return res.json()
}

export async function submitQuestion({ question, answer }) {
  const res = await fetch(`${BASE}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer }),
  })
  return res.json()
}

export async function login({ username, password }) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

export async function fetchPending() {
  const res = await fetch(`${BASE}/api/pending`)
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) throw new Error('获取待审核列表失败')
  return res.json()
}

export async function reviewQuestion({ id, action }) {
  const res = await fetch(`${BASE}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action }),
  })
  return res.json()
}
