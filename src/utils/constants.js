/** 应用级常量集中管理 */

/** IndexedDB 数据库名 */
export const DB_NAME = 'interview-helper-db'

/** IndexedDB 数据库版本（升级 schema 时递增） */
export const DB_VERSION = 1

/** 系统默认分类（始终存在且固定在末尾） */
export const DEFAULT_CATEGORY = '未分类'

/** 难度等级列表 */
export const DIFFICULTY_LEVELS = ['初级', '中级', '高级']

/** 默认难度等级 */
export const DEFAULT_DIFFICULTY = '中级'

/** 难度对应的 Tailwind 颜色类 */
export const DIFFICULTY_COLORS = {
  '初级': 'bg-green-100 text-green-700',
  '中级': 'bg-yellow-100 text-yellow-700',
  '高级': 'bg-red-100 text-red-700',
}

/** 难度默认颜色（未匹配时） */
export const DIFFICULTY_DEFAULT_COLOR = 'bg-gray-100 text-gray-700'

/** 题库管理每页显示条数 */
export const PAGE_SIZE = 20
