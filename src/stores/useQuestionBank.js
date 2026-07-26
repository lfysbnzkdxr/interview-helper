import { ref, computed } from 'vue'
import { getDB, generateId, initDB } from './db.js'
import { uploadBackup, downloadBackup, generateSyncCode, getSyncLink } from '../services/cloud-sync.js'

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
    return setting?.value || { providers: [], activeId: '' }
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
    // 去除 Vue 响应式代理，转为纯数组（IndexedDB 结构化克隆不支持 Proxy）
    const plain = [...cats]
    await db.put('settings', { key: 'categories', value: plain })
    categories.value = plain
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

  // ===== 云迁移（临时迁移码） =====

  /**
   * 生成迁移码并上传当前数据
   * @param {number} ttl - 过期秒数（600 | 86400）
   * @returns {Promise<{success, code?, link?, syncedAt?, expiresIn?, error?}>}
   */
  async function createMigration(ttl = 86400) {
    const code = generateSyncCode()
    const dataStr = await exportData()
    const data = JSON.parse(dataStr)

    const result = await uploadBackup(code, data, ttl)
    if (result.success) {
      return {
        success: true,
        code,
        link: getSyncLink(code),
        syncedAt: result.syncedAt,
        expiresIn: result.expiresIn || ttl,
      }
    }
    return result
  }

  /**
   * 预览云端数据（不写入本地）
   * @param {string} code - 迁移码
   * @returns {Promise<{success, preview?, error?}>}
   */
  async function previewCloudData(code) {
    const result = await downloadBackup(code)
    if (!result.success) return result

    const data = result.data
    const questionCount = data.questions?.length || 0
    const categoryCount = data.categories?.length || 0
    return {
      success: true,
      preview: { questionCount, categoryCount, categories: data.categories || [] },
      _raw: data, // 内部缓存，确认恢复时使用
    }
  }

  /**
   * 确认从云端恢复
   * @param {object} data - previewCloudData 返回的 _raw 数据
   * @param {'overwrite'|'merge'} mode
   */
  async function restoreFromCloud(data, mode = 'overwrite') {
    try {
      const innerData = JSON.stringify(data)
      await importData(innerData, mode)
      return { success: true }
    } catch (e) {
      return { success: false, error: '云端数据格式异常: ' + e.message }
    }
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
    // 云迁移
    createMigration,
    previewCloudData,
    restoreFromCloud,
  }
}
