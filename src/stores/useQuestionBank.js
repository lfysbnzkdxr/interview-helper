import { ref, computed } from 'vue'
import { getDB, generateId, initDB } from './db.js'

// 模块级状态（跨组件共享）
const questions = ref([])
const categories = ref([])
const loading = ref(false)
const loaded = ref(false)

export function useQuestionBank() {
  /**
   * 加载所有数据（首次调用时初始化 DB）
   */
  async function load() {
    if (loaded.value) return
    loading.value = true
    try {
      await initDB()
      const db = await getDB()
      const allQuestions = await db.getAll('questions')
      // 过滤隐藏的内置题
      questions.value = allQuestions.filter(q => !(q.builtIn && q.hidden))
      const catSetting = await db.get('settings', 'categories')
      categories.value = catSetting?.value || []
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 强制重新加载
   */
  async function reload() {
    loaded.value = false
    await load()
  }

  /**
   * 获取可见题目（排除隐藏的内置题）
   */
  const visibleQuestions = computed(() => questions.value)

  /**
   * 新增题目
   */
  async function addQuestion({ category, question, dialog, difficulty, source = '手动创建' }) {
    const db = await getDB()
    const now = Date.now()
    const newQ = {
      id: generateId(),
      category,
      question,
      dialog,
      difficulty,
      source,
      builtIn: false,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    }
    await db.put('questions', newQ)
    questions.value.push(newQ)
    return newQ
  }

  /**
   * 更新题目
   */
  async function updateQuestion(id, updates) {
    const db = await getDB()
    const existing = await db.get('questions', id)
    if (!existing) return null
    const updated = { ...existing, ...updates, updatedAt: Date.now() }
    await db.put('questions', updated)
    const idx = questions.value.findIndex(q => q.id === id)
    if (idx !== -1) questions.value[idx] = updated
    return updated
  }

  /**
   * 删除题目（内置题不可删除，只能隐藏）
   */
  async function deleteQuestion(id) {
    const db = await getDB()
    const existing = await db.get('questions', id)
    if (!existing) return
    if (existing.builtIn) {
      // 内置题只能隐藏
      await updateQuestion(id, { hidden: true })
      questions.value = questions.value.filter(q => q.id !== id)
    } else {
      await db.delete('questions', id)
      questions.value = questions.value.filter(q => q.id !== id)
    }
  }

  /**
   * 批量删除
   */
  async function deleteQuestions(ids) {
    for (const id of ids) {
      await deleteQuestion(id)
    }
  }

  /**
   * 隐藏/显示内置题
   */
  async function toggleHidden(id) {
    const db = await getDB()
    const existing = await db.get('questions', id)
    if (!existing || !existing.builtIn) return
    const newHidden = !existing.hidden
    await updateQuestion(id, { hidden: newHidden })
    if (newHidden) {
      questions.value = questions.value.filter(q => q.id !== id)
    } else {
      const updated = await db.get('questions', id)
      questions.value.push(updated)
    }
  }

  // ===== 设置相关 =====

  async function getApiConfig() {
    const db = await getDB()
    const setting = await db.get('settings', 'apiConfig')
    return setting?.value || { providers: [], activeId: '', proxyUrl: '' }
  }

  async function saveApiConfig(config) {
    const db = await getDB()
    // 去除 Vue 响应式代理，转为纯对象
    const plain = JSON.parse(JSON.stringify(config))
    await db.put('settings', { key: 'apiConfig', value: plain })
  }

  async function getCategories() {
    const db = await getDB()
    const setting = await db.get('settings', 'categories')
    return setting?.value || []
  }

  async function saveCategories(cats) {
    const db = await getDB()
    await db.put('settings', { key: 'categories', value: cats })
    categories.value = cats
  }

  // ===== 数据导入导出 =====

  async function exportData() {
    const db = await getDB()
    const allQuestions = await db.getAll('questions')
    const cats = await getCategories()
    return JSON.stringify({ categories: cats, questions: allQuestions }, null, 2)
  }

  async function importData(jsonStr, mode = 'merge') {
    const data = JSON.parse(jsonStr)
    const db = await getDB()

    if (mode === 'overwrite') {
      const tx = db.transaction('questions', 'readwrite')
      await tx.store.clear()
      await tx.done
    }

    if (data.questions && Array.isArray(data.questions)) {
      const tx = db.transaction('questions', 'readwrite')
      for (const q of data.questions) {
        await tx.store.put(q)
      }
      await tx.done
    }

    if (data.categories && Array.isArray(data.categories)) {
      await saveCategories(data.categories)
    }

    await reload()
  }

  async function resetToDefault() {
    const db = await getDB()
    // 清除所有题目
    const tx = db.transaction('questions', 'readwrite')
    await tx.store.clear()
    await tx.done
    // 删除初始化标记，重新触发种子导入
    await db.delete('settings', 'initialized')
    loaded.value = false
    await load()
  }

  return {
    questions: visibleQuestions,
    categories,
    loading,
    loaded,
    load,
    reload,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    deleteQuestions,
    toggleHidden,
    getApiConfig,
    saveApiConfig,
    getCategories,
    saveCategories,
    exportData,
    importData,
    resetToDefault,
  }
}
