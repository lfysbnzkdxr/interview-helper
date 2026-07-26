const DIFFICULTY_COLORS = {
  '初级': 'bg-green-100 text-green-700',
  '中级': 'bg-yellow-100 text-yellow-700',
  '高级': 'bg-red-100 text-red-700',
}

const DEFAULT_COLOR = 'bg-gray-100 text-gray-700'

export function getDifficultyColor(difficulty) {
  return DIFFICULTY_COLORS[difficulty] || DEFAULT_COLOR
}
