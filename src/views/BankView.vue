<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { renderMarkdown } from '../utils/markdown.js'
import { getDifficultyColor } from '../utils/helpers.js'

const { questions, categories, loading, load, deleteQuestion, deleteQuestions, toggleHidden, setHidden, updateQuestion, saveCategories } = useQuestionBank()

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
  if (!confirm('确定删除这道题吗？')) return
  await deleteQuestion(id)
}

async function handleBatchDelete() {
  if (!confirm(`确定删除选中的 ${selectedIds.value.length} 道题吗？`)) return
  await deleteQuestions(selectedIds.value)
  selectedIds.value = []
}

async function handleBatchHide() {
  for (const id of selectedIds.value) {
    await setHidden(id, true)
  }
  selectedIds.value = []
}

async function handleBatchUnhide() {
  for (const id of selectedIds.value) {
    await setHidden(id, false)
  }
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
  // 用户点击“确定”创建分类时意图已明确，直接执行移动
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
  if (!confirm(`确定将选中的 ${selectedIds.value.length} 道题移动到「${cat}」吗？`)) {
    batchCategory.value = ''
    return
  }
  for (const id of selectedIds.value) {
    await updateQuestion(id, { category: cat })
  }
  selectedIds.value = []
  batchCategory.value = ''
}

function startEdit(item) {
  // 若题目分类已不在当前分类列表中，归为「未分类」
  const cat = categories.value.includes(item.category) ? item.category : '未分类'
  editId.value = item.id
  editForm.value = { question: item.question, dialog: item.dialog, difficulty: item.difficulty, category: cat }
  expandedId.value = null
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
    <h2 class="text-xl font-bold text-gray-800 mb-4">题库管理</h2>

    <!-- 统计 -->
    <div class="flex flex-wrap gap-3 mb-4 text-sm">
      <span class="px-3 py-1 rounded-full bg-blue-100 text-blue-700">共 {{ stats.total }} 题</span>
      <span v-for="(count, diff) in stats.byDiff" :key="diff" class="px-3 py-1 rounded-full" :class="getDifficultyColor(diff)">
        {{ diff }} {{ count }}
      </span>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap gap-2 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索题目..."
        class="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <select v-model="filterCategory" class="px-3 py-2 rounded-lg border border-gray-300 text-sm">
        <option value="">全部分类</option>
        <option v-for="cat in sortedCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="filterDifficulty" class="px-3 py-2 rounded-lg border border-gray-300 text-sm">
        <option value="">全部难度</option>
        <option>初级</option>
        <option>中级</option>
        <option>高级</option>
      </select>
    </div>

    <!-- 批量操作 -->
    <div v-if="selectedIds.length > 0" class="flex items-center gap-3 mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200 flex-wrap">
      <span class="text-sm text-yellow-700">已选 {{ selectedIds.length }} 题</span>
      <select v-model="batchCategory" @change="onBatchCategoryChange(batchCategory)" class="px-2 py-1 rounded text-xs border border-gray-300 bg-white">
        <option value="" disabled>移动到分类...</option>
        <option v-for="cat in sortedCategories" :key="cat" :value="cat">{{ cat }}</option>
        <option value="__new__">+ 新建分类...</option>
      </select>
      <div v-if="showBatchNewCategory" class="flex items-center gap-1">
        <input
          v-model="batchNewCategoryName"
          @keyup.enter="confirmBatchNewCategory"
          placeholder="新分类名称"
          class="px-2 py-1 rounded text-xs border border-gray-300 w-28"
          autofocus
        />
        <button @click="confirmBatchNewCategory" class="px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600">确定</button>
        <button @click="cancelBatchNewCategory" class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">取消</button>
      </div>
      <button @click="handleBatchHide" class="px-3 py-1 rounded text-xs font-medium bg-gray-500 text-white hover:bg-gray-600">批量隐藏</button>
      <button @click="handleBatchUnhide" class="px-3 py-1 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600">取消隐藏</button>
      <button @click="handleBatchDelete" class="px-3 py-1 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600">批量删除</button>
      <button @click="selectedIds = []" class="px-3 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">取消选择</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-10 text-gray-400">加载中...</div>

    <!-- 空状态 -->
    <div v-else-if="filteredQuestions.length === 0" class="text-center py-10 text-gray-400">
      {{ questions.length === 0 ? '题库为空，去创建第一道题吧' : '没有匹配的题目' }}
    </div>

    <!-- 题目列表 -->
    <div v-else class="space-y-2">
      <!-- 全选 -->
      <label class="flex items-center gap-2 text-xs text-gray-500 mb-2 cursor-pointer">
        <input type="checkbox" :checked="selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0" @change="selectAll" />
        全选 ({{ filteredQuestions.length }})
      </label>

      <div
        v-for="item in filteredQuestions"
        :key="item.id"
        class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
      >
        <!-- 编辑模式 -->
        <div v-if="editId === item.id" class="p-4 space-y-3">
          <input v-model="editForm.question" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" placeholder="问题" />
          <select v-model="editForm.category" class="px-3 py-2 rounded border border-gray-300 text-sm">
            <option v-for="cat in sortedCategories" :key="cat" :value="cat">{{ cat }}</option>
            <option v-if="!sortedCategories.includes('未分类')" value="未分类">未分类</option>
          </select>
          <select v-model="editForm.difficulty" class="px-3 py-2 rounded border border-gray-300 text-sm">
            <option>初级</option><option>中级</option><option>高级</option>
          </select>
          <textarea v-model="editForm.dialog" rows="8" class="w-full px-3 py-2 rounded border border-gray-300 text-sm font-mono resize-y"></textarea>
          <div class="flex gap-2">
            <button @click="saveEdit" class="px-3 py-1.5 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600">保存</button>
            <button @click="cancelEdit" class="px-3 py-1.5 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">取消</button>
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
              <h3 class="mt-1 text-sm font-medium text-gray-800 truncate">{{ item.question }}</h3>
            </div>
          </div>

          <!-- 展开内容 -->
          <div v-if="expandedId === item.id" class="px-4 pb-3 border-t border-gray-100">
            <div class="prose-content mt-2 text-sm text-gray-700" v-html="renderMarkdown(item.dialog)"></div>
          </div>

          <!-- 操作按钮 -->
          <div class="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-2">
            <button @click="startEdit(item)" class="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">编辑</button>
            <button @click="toggleHidden(item.id)" class="px-3 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">{{ item.hidden ? '取消隐藏' : '隐藏' }}</button>
            <button @click="handleDelete(item.id)" class="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">删除</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
