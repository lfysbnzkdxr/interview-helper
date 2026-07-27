<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { optimizeQA, generateQA } from '../services/llm.js'
import { renderMarkdown } from '../utils/markdown.js'
import { useToast } from '../composables/useToast.js'
import { DEFAULT_CATEGORY, DIFFICULTY_LEVELS, DEFAULT_DIFFICULTY } from '../utils/constants.js'

const { categories, addQuestion, load, saveCategories } = useQuestionBank()
const { success } = useToast()

onMounted(() => load())

const question = ref('')
const answer = ref('')
const selectedCategory = ref('')
const loading = ref(false)
const error = ref('')
const step = ref('') // AI 处理进度提示

// AI 优化结果预览
const preview = ref(null)
const previewDialog = ref('')
const previewQuestion = ref('')
const previewDifficulty = ref('')

const canSubmit = computed(() =>
  question.value.trim() &&
  selectedCategory.value && selectedCategory.value !== '__new__'
)

const canManualSave = computed(() =>
  question.value.trim() && answer.value.trim() &&
  selectedCategory.value && selectedCategory.value !== '__new__'
)

// 新建分类
const newCategoryName = ref('')
const showNewCategory = computed(() => selectedCategory.value === '__new__')

async function confirmNewCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  if (!categories.value.includes(name)) {
    const cats = categories.value.filter(c => c !== DEFAULT_CATEGORY)
    cats.push(name)
    if (categories.value.includes(DEFAULT_CATEGORY)) cats.push(DEFAULT_CATEGORY)
    await saveCategories(cats)
  }
  selectedCategory.value = name
  newCategoryName.value = ''
}

function cancelNewCategory() {
  selectedCategory.value = ''
  newCategoryName.value = ''
}

async function handleOptimize() {
  error.value = ''
  preview.value = null

  if (!question.value.trim()) { error.value = '请输入面试问题'; return }
  if (!selectedCategory.value || selectedCategory.value === '__new__') { error.value = '请选择分类'; return }

  loading.value = true
  step.value = '正在连接 AI 服务...'

  try {
    let result
    if (answer.value.trim()) {
      step.value = 'AI 正在优化问答格式...'
      result = await optimizeQA(question.value.trim(), answer.value.trim())
    } else {
      step.value = 'AI 正在生成回答...'
      result = await generateQA(question.value.trim())
    }

    preview.value = result
    previewQuestion.value = result.optimized_question || question.value
    previewDialog.value = result.dialog || answer.value
    previewDifficulty.value = result.difficulty || DEFAULT_DIFFICULTY
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
    step.value = ''
  }
}

function handleManualSave() {
  preview.value = { manual: true }
  previewQuestion.value = question.value
  previewDialog.value = answer.value
  previewDifficulty.value = DEFAULT_DIFFICULTY
}

async function handleSave() {
  error.value = ''
  try {
    // 确保「未分类」进入分类列表
    if (selectedCategory.value === DEFAULT_CATEGORY && !categories.value.includes(DEFAULT_CATEGORY)) {
      await saveCategories([...categories.value, DEFAULT_CATEGORY])
    }
    await addQuestion({
      category: selectedCategory.value,
      question: previewQuestion.value,
      dialog: previewDialog.value,
      difficulty: previewDifficulty.value,
      source: preview.value?.manual ? '手动创建' : 'AI生成',
    })
    // 重置表单
    question.value = ''
    answer.value = ''
    preview.value = null
    error.value = ''
    success('已保存到题库！')
  } catch (e) {
    error.value = '保存失败: ' + e.message
  }
}

function cancelPreview() {
  preview.value = null
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">创建问答</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      输入面试问题，可选 AI 生成对话格式答案；也可输入答案让 AI 优化格式，或者直接手动保存。
    </p>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
      {{ error }}
    </div>

    <!-- 预览模式 -->
    <div v-if="preview" class="space-y-4">
      <div class="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
        <h3 class="font-medium text-blue-800 mb-3">预览 & 编辑</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">问题标题</label>
            <input v-model="previewQuestion" class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">难度</label>
            <select v-model="previewDifficulty" class="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
              <option v-for="d in DIFFICULTY_LEVELS" :key="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">对话内容（Markdown）</label>
            <textarea v-model="previewDialog" rows="12" class="w-full px-3 py-2 rounded border border-gray-300 text-sm font-mono resize-y focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
          </div>
        </div>

        <!-- 渲染预览 -->
        <div class="mt-3 p-3 bg-white rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <p class="text-xs text-gray-400 dark:text-gray-500 mb-2">渲染预览：</p>
          <div class="prose-content text-sm text-gray-700 dark:text-gray-300" v-html="renderMarkdown(previewDialog)"></div>
        </div>

        <div class="flex gap-3 mt-4">
          <button @click="handleSave" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors">
            保存到题库
          </button>
          <button @click="cancelPreview" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
            返回修改
          </button>
        </div>
      </div>
    </div>

    <!-- 输入表单 -->
    <form v-else @submit.prevent="handleOptimize" class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">面试问题</label>
        <input
          v-model="question"
          type="text"
          placeholder="例如：请解释 RAG 的核心流程及其解决了什么问题？"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">答案要点</label>
        <textarea
          v-model="answer"
          rows="8"
          placeholder="可选。输入答案要点让 AI 优化格式；留空则由 AI 自动生成完整回答。"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        ></textarea>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{{ answer.length }} 字</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
        <select
          v-if="!showNewCategory"
          v-model="selectedCategory"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="" disabled>选择分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          <option v-if="!categories.includes(DEFAULT_CATEGORY)" :value="DEFAULT_CATEGORY">未分类</option>
          <option value="__new__">+ 新建分类...</option>
        </select>
        <div v-else class="flex gap-2">
          <input
            v-model="newCategoryName"
            type="text"
            placeholder="输入新分类名称"
            class="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            @keyup.enter="confirmNewCategory"
          />
          <button type="button" @click="confirmNewCategory" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">确定</button>
          <button type="button" @click="cancelNewCategory" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300">取消</button>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="loading || !canSubmit"
          class="flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors"
          :class="loading || !canSubmit ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'"
        >
          <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
          {{ loading ? step : (answer.trim() ? 'AI 优化' : 'AI 生成回答') }}
        </button>
        <button
          type="button"
          @click="handleManualSave"
          :disabled="!canManualSave"
          class="px-4 py-3 rounded-lg font-medium transition-colors"
          :class="!canManualSave ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
        >
          跳过 AI，直接保存
        </button>
      </div>
    </form>
  </div>
</template>
