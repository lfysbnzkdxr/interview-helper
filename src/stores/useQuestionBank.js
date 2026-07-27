import { ref, computed } from 'vue'
import { getDB, generateId, initDB } from './db.js'
import { uploadBackup, downloadBackup, generateSyncCode, getSyncLink } from '../services/cloud-sync.js'

// 模块级状态（跨组件共享）
const questions = ref([])
const categories = ref([])
const loading = ref(false)
const loaded = ref(false)
const loadError = ref('')

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
      // 保留所有题目（含隐藏），各视图自行过滤
      questions.value = allQuestions
      const catSetting = await db.get('settings', 'categories')
      categories.value = catSetting?.value || []

      // 修复孤立分类：题目的分类不在当前列表中时，归为「未分类」
      const catSet = new Set(categories.value)
      const orphans = questions.value.filter(q => q.category && !catSet.has(q.category))
      if (orphans.length > 0) {
        for (const q of orphans) {
          q.category = '未分类'
          q.updatedAt = Date.now()
          await db.put('questions', JSON.parse(JSON.stringify(q)))
        }
      }

      // 兑容迁移：旧版本初始化的数据库可能缺少「未分类」
      if (!categories.value.includes('未分类')) {
        categories.value.push('未分类')
        await db.put('settings', { key: 'categories', value: JSON.parse(JSON.stringify(categories.value)) })
      }

      loaded.value = true
    } catch (e) {
      loadError.value = '数据加载失败: ' + (e.message || '未知错误')
      console.error('数据加载失败:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 强制重新加载
   */
  async function reload() {
    loaded.value = false
    loadError.value = ''
    await load()
  }

  /**
   * 全部题目（含隐藏）
   */
  const allQuestions = questions

  /**
   * 可见题目（排除隐藏题）
   */
  const visibleQuestions = computed(() => questions.value.filter(q => !q.hidden))

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
   * 删除题目
   */
  async function deleteQuestion(id) {
    const db = await getDB()
    const existing = await db.get('questions', id)
    if (!existing) return
    await db.delete('questions', id)
    questions.value = questions.value.filter(q => q.id !== id)
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
   * 批量更新（单事务）
   * 对指定 id 列表执行统一字段更新，大幅减少 IndexedDB 事务次数
   * @param {string[]} ids - 题目 id 列表
   * @param {object} updates - 要更新的字段
   */
  async function batchUpdate(ids, updates) {
    const db = await getDB()
    const tx = db.transaction('questions', 'readwrite')
    const idSet = new Set(ids)
    for (const id of ids) {
      const existing = await tx.store.get(id)
      if (existing) {
        await tx.store.put({ ...existing, ...updates, updatedAt: Date.now() })
      }
    }
    await tx.done
    questions.value = questions.value.map(q =>
      idSet.has(q.id) ? { ...q, ...updates, updatedAt: Date.now() } : q
    )
  }

  /**
   * 批量删除（单事务）
   * @param {string[]} ids - 要删除的题目 id 列表
   */
  async function batchDelete(ids) {
    const db = await getDB()
    const tx = db.transaction('questions', 'readwrite')
    for (const id of ids) await tx.store.delete(id)
    await tx.done
    const idSet = new Set(ids)
    questions.value = questions.value.filter(q => !idSet.has(q.id))
  }

  /**
   * 隐藏/显示内置题
   */
  async function toggleHidden(id) {
    const db = await getDB()
    const existing = await db.get('questions', id)
    if (!existing) return
    await updateQuestion(id, { hidden: !existing.hidden })
  }

  async function setHidden(id, hidden) {
    await updateQuestion(id, { hidden })
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

    // 字段白名单：防止原型污染或任意属性注入
    const ALLOWED_FIELDS = ['id', 'category', 'question', 'dialog', 'difficulty', 'source', 'builtIn', 'hidden', 'createdAt', 'updatedAt']

    if (data.questions && Array.isArray(data.questions)) {
      const tx = db.transaction('questions', 'readwrite')
      for (const raw of data.questions) {
        const q = {}
        for (const f of ALLOWED_FIELDS) {
          if (raw[f] !== undefined) q[f] = raw[f]
        }
        if (!q.id || !q.question) continue // 跳过无效记录
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

  /**
   * 检测合并冲突：按题目文本比对本地与云端
   * @param {object} cloudData - { questions, categories }
   * @returns {{ conflicts: Array, newQuestions: Array }}
   *   conflicts: [{ local, cloud }] 题目文本相同但 id 不同
   *   newQuestions: 本地不存在的题目（可直接导入）
   */
  function detectMergeConflicts(cloudData) {
    const localTexts = new Map(questions.value.map(q => [q.question.trim(), q]))
    const conflicts = []
    const newQuestions = []

    for (const cq of (cloudData.questions || [])) {
      const localQ = localTexts.get(cq.question.trim())
      if (localQ && localQ.id !== cq.id) {
        // 同一题目文本、不同 id → 冲突
        conflicts.push({ local: localQ, cloud: cq })
      } else if (!localQ) {
        // 本地不存在 → 新题目
        newQuestions.push(cq)
      }
      // id 相同 → 已存在，跳过
    }
    return { conflicts, newQuestions }
  }

  /**
   * 应用合并决策
   * @param {Array} decisions - [{ conflict, choice: 'local'|'cloud'|'both' }]
   * @param {Array} newQuestions - 无冲突的新题目
   * @param {Array} cloudCategories - 云端分类列表
   */
  async function applyMergeDecisions(decisions, newQuestions, cloudCategories) {
    const db = await getDB()
    const tx = db.transaction('questions', 'readwrite')

    // 导入无冲突的新题目
    for (const q of newQuestions) {
      await tx.store.put(q)
    }

    // 处理冲突决策
    for (const { conflict, choice } of decisions) {
      if (choice === 'cloud') {
        // 用云端版本替换本地（保留本地 id 以避免引用断裂）
        const updated = { ...conflict.local, dialog: conflict.cloud.dialog, difficulty: conflict.cloud.difficulty, category: conflict.cloud.category, updatedAt: Date.now() }
        await tx.store.put(updated)
      } else if (choice === 'both') {
        // 都保留：云端版本作为新题目插入（新 id）
        const newQ = { ...conflict.cloud, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() }
        await tx.store.put(newQ)
      }
      // 'local' → 不做任何操作
    }
    await tx.done

    // 合并分类（云端新分类追加到本地）
    if (cloudCategories && cloudCategories.length) {
      const merged = [...categories.value]
      for (const c of cloudCategories) {
        if (!merged.includes(c)) merged.push(c)
      }
      await saveCategories(merged)
    }

    await reload()
  }

  return {
    allQuestions,
    visibleQuestions,
    categories,
    loading,
    loaded,
    loadError,
    load,
    reload,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    batchUpdate,
    batchDelete,
    toggleHidden,
    setHidden,
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
    detectMergeConflicts,
    applyMergeDecisions,
  }
}
