// 分类 ID → 显示名称映射（必须与 D1 数据库 categories 表一致）
const CATEGORY_MAP = {
  1: 'Agent 智能体',
  2: 'RAG 检索增强',
  3: 'LLM 大模型',
  4: 'Python',
}

const DEFAULT_CATEGORY = '未知分类'

export function getCategoryName(categoryId) {
  return CATEGORY_MAP[categoryId] || DEFAULT_CATEGORY
}

const DIFFICULTY_COLORS = {
  '初级': 'bg-green-100 text-green-700',
  '中级': 'bg-yellow-100 text-yellow-700',
  '高级': 'bg-red-100 text-red-700',
}

const DEFAULT_COLOR = 'bg-gray-100 text-gray-700'

export function getDifficultyColor(difficulty) {
  return DIFFICULTY_COLORS[difficulty] || DEFAULT_COLOR
}
