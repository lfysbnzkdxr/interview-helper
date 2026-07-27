import { ref, computed } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'

const REFILL_THRESHOLD = 5

// Fisher-Yates 洗牌算法
function shuffle(arr) {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function useQuestionQueue() {
  const { questions: storeQuestions, loading: storeLoading, load, categories } = useQuestionBank()

  const queue = ref([])
  const currentIndex = ref(0)
  const difficulty = ref('全部')
  const category = ref('全部')
  const isFlipped = ref(false)

  const currentQuestion = computed(() => queue.value[currentIndex.value] || null)
  const isFirst = computed(() => currentIndex.value === 0)
  const isLast = computed(() => currentIndex.value === queue.value.length - 1)
  const progress = computed(() => `${currentIndex.value + 1} / ${queue.value.length}`)

  function getPool(diff, cat) {
    let visible = storeQuestions.value.filter(q => !q.hidden)
    if (diff && diff !== '全部') visible = visible.filter(q => q.difficulty === diff)
    if (cat && cat !== '全部') visible = visible.filter(q => q.category === cat)
    return visible
  }

  function initQueue(diff, cat) {
    difficulty.value = diff || '全部'
    category.value = cat || '全部'
    const pool = getPool(difficulty.value, category.value)
    const queueSize = Math.min(20, pool.length)
    queue.value = shuffle(pool).slice(0, queueSize)
    currentIndex.value = 0
    isFlipped.value = false
  }

  function refillQueue() {
    const pool = getPool(difficulty.value, category.value)
    const existingIds = new Set(queue.value.map(q => q.id))
    let newItems = shuffle(pool).filter(q => !existingIds.has(q.id))

    if (newItems.length < REFILL_THRESHOLD) {
      newItems = shuffle(pool).slice(0, 10)
    }

    queue.value = [...queue.value, ...newItems.slice(0, 10)]
  }

  function next() {
    if (currentIndex.value < queue.value.length - 1) {
      currentIndex.value++
      isFlipped.value = false
      if (queue.value.length - currentIndex.value - 1 <= REFILL_THRESHOLD) {
        refillQueue()
      }
    }
  }

  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--
      isFlipped.value = false
    }
  }

  function flip() {
    isFlipped.value = !isFlipped.value
  }

  function setDifficulty(diff) {
    initQueue(diff, category.value)
  }

  function setCategory(cat) {
    initQueue(difficulty.value, cat)
  }

  // 异步加载数据（使用共享缓存，首次加载后复用）
  async function loadData() {
    await load()
    initQueue(difficulty.value, category.value)
  }

  return {
    queue,
    currentIndex,
    difficulty,
    category,
    categories,
    isFlipped,
    loading: storeLoading,
    currentQuestion,
    isFirst,
    isLast,
    progress,
    next,
    prev,
    flip,
    loadData,
    setDifficulty,
    setCategory,
  }
}
