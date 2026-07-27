import { DIFFICULTY_COLORS, DIFFICULTY_DEFAULT_COLOR } from './constants.js'

export function getDifficultyColor(difficulty) {
  return DIFFICULTY_COLORS[difficulty] || DIFFICULTY_DEFAULT_COLOR
}
