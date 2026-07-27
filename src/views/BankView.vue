<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { renderMarkdown } from '../utils/markdown.js'
import { getDifficultyColor } from '../utils/helpers.js'
import { polishDialog, appendSubQA } from '../services/llm.js'
import BankFilterBar from '../components/bank/BankFilterBar.vue'
import BankBatchBar from '../components/bank/BankBatchBar.vue'
import AiPolishCompare from '../components/bank/AiPolishCompare.vue'

const { allQuestions: questions, categories, loading, loadError, load, reload, deleteQuestion, deleteQuestions, toggleHidden, setHidden, updateQuestion, saveCategories } = useQuestionBank()

const searchQuery = ref('')
const filterCategory = ref('')
const filterDifficulty = ref('')
const expandedId = ref(null)
const selectedIds = ref([])
const editId = ref(null)
const editForm = ref({ question: '', dialog: '', difficulty: '', category: '' })
const batchCategory = ref('')
const showBatchNewCategory = ref(false)
const batchNewCategoryName = ref('')

// AI 润色/子问题
const aiLoading = ref(false)
const aiError = ref('')
const showSubQuestion = ref(false)
const subQuestionText = ref('')

// AI 润色对比
const showCompare = ref(false)
const originalDialog = ref('')
const polishedDialog = ref('')
const polishedDifficulty = ref('')
const compareEditSide = ref(null)

// 分类排序：「未分类」始终排在最后
const sortedCategories = computed(() => {
  const cats = [...categories.value]
  return cats.sort((a, b) => {
    if (a === '未分类') return 1
    if (b === '未分类') return -1
    return 0
  })
})

onMounted(() => { load() })

const filteredQuestions = computed(() => {
  let list = questions.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(item => item.question.toLowerCase().includes(q) || item.dialog.toLowerCase().includes(q))
  }
  if (filterCategory.value) {
    list = list.filter(item => item.category === filterCategory.value)
  }
  if (filterDifficulty.value) {
    list = list.filter(item => item.difficulty === filterDifficulty.value)
  }
  return list
})

const stats = computed(() => {
  const total = questions.value.length
  const byCat = {}
  const byDiff = { '初级': 0, '中级': 0, '高级': 0 }
  questions.value.forEach(q => {
    byCat[q.category] = (byCat[q.category] || 0) + 1
    if (byDiff[q.difficulty] !== undefined) byDiff[q.difficulty]++
  })
  return { total, byCat, byDiff }
})

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

function selectAll() {
  if (selectedIds.value.length === filteredQuestions.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredQuestions.value.map(q => q.id)
  }
}

async function handleDelete(id) {
  if (!await confirm({ title: '删除确认', message: '确定删除这道题吗？', danger: true })) return
  await deleteQuestion(id)
  success('已删除')
}

async function handleBatchDelete() {
  const count = selectedIds.value.length
  if (!await confirm({ title: '批量删除确认', message: `确定删除选中的 ${count} 道题吗？`, danger: true })) return
  await deleteQuestions(selectedIds.value)
  selectedIds.value = []
  success(`已删除 ${count} 道题`)
}

async function handleBatchHide() {
  await batchUpdate([...selectedIds.value], { hidden: true })
  selectedIds.value = []
}

async function handleBatchUnhide() {
  await batchUpdate([...selectedIds.value], { hidden: false })
  selectedIds.value = []
}

function onBatchCategoryChange(cat) {
  if (cat === '__new__') {
    showBatchNewCategory.value = true
    batchCategory.value = ''
    return
  }
  handleBatchMove(cat)
}

async function confirmBatchNewCategory() {
  const name = batchNewCategoryName.value.trim()
  if (!name) return
  if (!categories.value.includes(name)) {
    const cats = categories.value.filter(c => c !== '未分类')
    cats.push(name)
    if (categories.value.includes('未分类')) cats.push('未分类')
    await saveCategories(cats)
  }
  showBatchNewCategory.value = false
  batchNewCategoryName.value = ''
  for (const id of selectedIds.value) {
    await updateQuestion(id, { category: name })
  }
  selectedIds.value = []
  batchCategory.value = ''
}

function cancelBatchNewCategory() {
  showBatchNewCategory.value = false
  batchNewCategoryName.value = ''
}

async function handleBatchMove(cat) {
  if (!cat) return
  if (!await confirm({ title: '批量移动确认', message: `确定将选中的 ${selectedIds.value.length} 道题移动到「${cat}」吗？` })) {
    batchCategory.value = ''
    return
  }
  await batchUpdate([...selectedIds.value], { category: cat })
  selectedIds.value = []
  batchCategory.value = ''
}

function startEdit(item) {
  const cat = categories.value.includes(item.category) ? item.category : '未分类'
  editId.value = item.id
  editForm.value = { question: item.question, dialog: item.dialog, difficulty: item.difficulty, category: cat }
  expandedId.value = null
  aiError.value = ''
  showSubQuestion.value = false
  subQuestionText.value = ''
}

async function handleAiPolish() {
  if (!editForm.value.dialog.trim()) { aiError.value = '对话内容为空，无法润色'; return }
  aiError.value = ''
  aiLoading.value = true
  const targetId = editId.value
  try {
    const result = await polishDialog(editForm.value.question, editForm.value.dialog)
    if (editId.value !== targetId) return
    originalDialog.value = editForm.value.dialog
    polishedDialog.value = result.dialog || editForm.value.dialog
    polishedDifficulty.value = result.difficulty || ''
    compareEditSide.value = null
    showCompare.value = true
  } catch (e) {
    if (editId.value !== targetId) return
    aiError.value = e.message
  } finally {
    aiLoading.value = false
  }
}

function keepOriginal() {
  showCompare.value = false
}

function keepPolished() {
  editForm.value.dialog = polishedDialog.value
  if (polishedDifficulty.value) editForm.value.difficulty = polishedDifficulty.value
  showCompare.value = false
}

async function handleAppendSub() {
  const sub = subQuestionText.value.trim()
  if (!sub) return
  aiError.value = ''
  aiLoading.value = true
  const targetId = editId.value
  try {
    const result = await appendSubQA(editForm.value.question, editForm.value.dialog, sub)
    if (editId.value !== targetId) return
    editForm.value.dialog = result.dialog || editForm.value.dialog
    if (result.difficulty) editForm.value.difficulty = result.difficulty
    subQuestionText.value = ''
    showSubQuestion.value = false
  } catch (e) {
    if (editId.value !== targetId) return
    aiError.value = e.message
  } finally {
    aiLoading.value = false
  }
}

async function saveEdit() {
  await updateQuestion(editId.value, { ...editForm.value })
  editId.value = null
}

function cancelEdit() {
  editId.value = null
}
</script>

<template>
  <div class="w-[92%] md:w-full md:max-w-[720px] mx-auto">
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">题库管理</h2>

    <BankFilterBar
      v-model:searchQuery="searchQuery"
      v-model:filterCategory="filterCategory"
      v-model:filterDifficulty="filterDifficulty"
      :sortedCategories="sortedCategories"
      :stats="stats"
    />

    <BankBatchBar
      :selectedCount="selectedIds.length"
      :sortedCategories="sortedCategories"
      v-model:batchCategory="batchCategory"
      v-model:showBatchNewCategory="showBatchNewCategory"
      v-model:batchNewCategoryName="batchNewCategoryName"
      @batch-hide="handleBatchHide"
      @batch-unhide="handleBatchUnhide"
      @batch-delete="handleBatchDelete"
      @confirm-new-category="confirmBatchNewCategory"
      @cancel-new-category="cancelBatchNewCategory"
      @clear-selection="selectedIds = []"
    />

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-10 text-gray-400 dark:text-gray-500">加载中...</div>

    <!-- 加载错误 -->
    <div v-else-if="loadError" class="text-center py-10">
      <p class="text-red-500 mb-4">{{ loadError }}</p>
      <button @click="reload" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredQuestions.length === 0" class="text-center py-10 text-gray-400 dark:text-gray-500">
      {{ questions.length === 0 ? '题库为空，去创建第一道题吧' : '没有匹配的题目' }}
    </div>

    <!-- 题目列表 -->
    <div v-else class="space-y-2">
      <label class="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 cursor-pointer">
        <input type="checkbox" :checked="selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0" @change="selectAll" />
        全选 ({{ filteredQuestions.length }})
      </label>

      <div v-for="item in filteredQuestions" :key="item.id" class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <!-- 编辑模式 -->
        <div v-if="editId === item.id" class="p-4 space-y-3">
          <input v-model="editForm.question" class="w-full px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" placeholder="问题" />
          <select v-model="editForm.category" class="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <option v-for="cat in sortedCategories" :key="cat" :value="cat">{{ cat }}</option>
            <option v-if="!sortedCategories.includes('未分类')" value="未分类">未分类</option>
          </select>
          <select v-model="editForm.difficulty" class="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <option>初级</option><option>中级</option><option>高级</option>
          </select>
          <textarea v-model="editForm.dialog" rows="8" class="w-full px-3 py-2 rounded border border-gray-300 text-sm font-mono resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
          <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div v-if="aiError" class="text-xs text-red-600">{{ aiError }}</div>
            <div class="flex gap-2 items-center flex-wrap">
              <button @click="handleAiPolish" :disabled="aiLoading"
                class="px-3 py-1.5 rounded text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 inline-flex items-center gap-1.5">
                <span v-if="aiLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {{ aiLoading ? 'AI 处理中...' : 'AI 润色对话' }}
              </button>
              <button @click="showSubQuestion = !showSubQuestion" :disabled="aiLoading"
                class="px-3 py-1.5 rounded text-xs font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50">
                + 新增子问题
              </button>
            </div>
            <div v-if="showSubQuestion" class="flex gap-2">
              <input v-model="subQuestionText" @keyup.enter="handleAppendSub"
                placeholder="输入子问题，AI 将生成回答"
                class="flex-1 px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
              <button @click="handleAppendSub" :disabled="aiLoading || !subQuestionText.trim()"
                class="px-3 py-1.5 rounded text-xs font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 inline-flex items-center gap-1.5">
                <span v-if="aiLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                生成回答
              </button>
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="saveEdit" class="px-3 py-1.5 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600">保存</button>
            <button @click="cancelEdit" class="px-3 py-1.5 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">取消</button>
          </div>
        </div>

        <!-- 显示模式 -->
        <template v-else>
          <div class="p-3 flex items-start gap-2 cursor-pointer" @click="toggleExpand(item.id)">
            <input type="checkbox" :checked="selectedIds.includes(item.id)" @click.stop @change="toggleSelect(item.id)" class="mt-1" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs px-2 py-0.5 rounded-full" :class="getDifficultyColor(item.difficulty)">{{ item.difficulty }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{{ categories.includes(item.category) ? item.category : '未分类' }}</span>
                <span v-if="item.builtIn" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">内置</span>
                <span v-else class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">{{ item.source }}</span>
                <span v-if="item.hidden" class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">已隐藏</span>
              </div>
              <h3 class="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ item.question }}</h3>
            </div>
          </div>
          <div v-if="expandedId === item.id" class="px-4 pb-3 border-t border-gray-100 dark:border-gray-700">
            <div class="prose-content mt-2 text-sm text-gray-700 dark:text-gray-300" v-html="renderMarkdown(item.dialog)"></div>
          </div>
          <div class="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 dark:bg-gray-700 dark:border-gray-700">
            <button @click="startEdit(item)" class="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">编辑</button>
            <button @click="toggleHidden(item.id)" class="px-3 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">{{ item.hidden ? '取消隐藏' : '隐藏' }}</button>
            <button @click="handleDelete(item.id)" class="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">删除</button>
          </div>
        </template>
      </div>
    </div>

    <AiPolishCompare
      :show="showCompare"
      :originalDialog="originalDialog"
      :polishedDialog="polishedDialog"
      :polishedDifficulty="polishedDifficulty"
      :compareEditSide="compareEditSide"
      @close="showCompare = false"
      @keep-original="keepOriginal"
      @keep-polished="keepPolished"
    />
  </div>
</template>
