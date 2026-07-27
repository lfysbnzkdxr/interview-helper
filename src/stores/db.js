import { openDB } from 'idb'
import seedData from '../data/seed-questions.json'

const DB_NAME = 'interview-helper-db'
const DB_VERSION = 1

let dbPromise = null

/**
 * 获取数据库实例（单例）
 */
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 题目表
        const questionStore = db.createObjectStore('questions', { keyPath: 'id' })
        questionStore.createIndex('category', 'category')
        questionStore.createIndex('difficulty', 'difficulty')
        questionStore.createIndex('builtIn', 'builtIn')

        // 设置表
        db.createObjectStore('settings', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

/**
 * 生成 UUID
 */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/**
 * 初始化数据库：首次访问时导入种子数据
 */
export async function initDB() {
  const db = await getDB()

  // 检查是否已初始化
  const initialized = await db.get('settings', 'initialized')
  if (initialized) return

  // 导入分类（「未分类」为系统默认，始终存在且固定在末尾）
  const categories = seedData.categories.map(c => c.display_name)
  if (!categories.includes('未分类')) categories.push('未分类')
  await db.put('settings', { key: 'categories', value: categories })

  // 导入默认 API 配置
  await db.put('settings', {
    key: 'apiConfig',
    value: {
      providers: [],
      activeId: '',
    },
  })

  // 导入种子题目
  const categoryMap = {}
  seedData.categories.forEach(c => {
    categoryMap[c.id] = c.display_name
  })

  const now = Date.now()
  const questions = seedData.questions.map(q => ({
    id: generateId(),
    category: categoryMap[q.category_id] || '未分类',
    question: q.question,
    dialog: q.dialog,
    difficulty: q.difficulty,
    source: '内置',
    builtIn: true,
    hidden: false,
    createdAt: now,
    updatedAt: now,
  }))

  const tx = db.transaction('questions', 'readwrite')
  for (const q of questions) {
    await tx.store.put(q)
  }
  await tx.done

  // 标记已初始化
  await db.put('settings', { key: 'initialized', value: true })
}
