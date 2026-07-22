import { ref } from 'vue'
import { fetchQuestions } from '../api/index.js'

// ===== localStorage 缓存配置 =====
const CACHE_KEY = 'ih_questions_cache'
const CACHE_TTL = 10 * 60 * 1000 // 缓存有效期：10 分钟

// 模块级状态：跨组件、跨路由持久化，避免重复请求
const categories = ref([])
const questions = ref([])
const loading = ref(false)
const loaded = ref(false)
const error = ref(null)

// 防止并发重复请求
let fetchPromise = null

// ===== localStorage 读写 =====
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw)
    if (!cache || !Array.isArray(cache.questions) || !Array.isArray(cache.categories)) return null
    return cache
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        categories: data.categories,
        questions: data.questions,
      })
    )
  } catch (e) {
    // 容量超限等异常不阻断主流程，仅降级为内存缓存
    console.warn('写入本地缓存失败:', e)
  }
}

function isFresh(cache) {
  return cache && typeof cache.timestamp === 'number' && Date.now() - cache.timestamp < CACHE_TTL
}

// 请求最新数据并更新状态与缓存
// 若屏幕上已有数据（loaded=true）则静默刷新，避免 loading 闪烁
function revalidate() {
  if (fetchPromise) return fetchPromise
  if (!loaded.value) loading.value = true
  error.value = null

  fetchPromise = fetchQuestions()
    .then(data => {
      const payload = {
        categories: data.categories || [],
        questions: data.questions || [],
      }
      categories.value = payload.categories
      questions.value = payload.questions
      writeCache(payload)
      loaded.value = true
    })
    .catch(e => {
      error.value = e
      console.error('加载题目失败:', e)
    })
    .finally(() => {
      loading.value = false
      fetchPromise = null
    })

  return fetchPromise
}

export function useQuestionsStore() {
  /**
   * 加载题目数据（Stale-While-Revalidate 策略）
   * 1. 内存已有且非强制 → 直接返回
   * 2. localStorage 有缓存 → 立即渲染（秒开）
   *    - 缓存新鲜且非强制 → 不发网络请求
   *    - 缓存过期或强制 → 后台静默刷新
   * 3. 无缓存 → 正常请求（显示 loading）
   */
  async function load(force = false) {
    if (loaded.value && !force) return

    const cache = readCache()
    if (cache) {
      categories.value = cache.categories
      questions.value = cache.questions
      loaded.value = true
      if (isFresh(cache) && !force) return
      return revalidate()
    }

    return revalidate()
  }

  return { categories, questions, loading, error, load }
}
