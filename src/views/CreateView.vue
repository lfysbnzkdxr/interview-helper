<script setup>
import { ref, computed } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { optimizeQA } from '../services/llm.js'
import { renderMarkdown } from '../utils/markdown.js'

const { categories, addQuestion, load } = useQuestionBank()

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

const canSubmit = computed(() => question.value.trim() && answer.value.trim() && selectedCategory.value)

async function handleOptimize() {
  error.value = ''
  preview.value = null

  if (!question.value.trim()) { error.value = '请输入面试问题'; return }
  if (!answer.value.trim()) { error.value = '请输入答案内容'; return }
  if (!selectedCategory.value) { error.value = '请选择分类'; return }

  loading.value = true
  step.value = '正在连接 AI 服务...'

  try {
    step.value = 'AI 正在优化问答格式...'
    const result = await optimizeQA(question.value.trim(), answer.value.trim())

    preview.value = result
    previewQuestion.value = result.optimized_question || question.value
    previewDialog.value = result.dialog || answer.value
    previewDifficulty.value = result.difficulty || '中级'
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
  previewDifficulty.value = '中级'
}

async function handleSave() {
  error.value = ''
  try {
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
    alert('已保存到题库！')
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
    <h2 class="text-xl font-bold text-gray-800 mb-2">创建问答</h2>
    <p class="text-sm text-gray-500 mb-6">
      输入面试问题和答案要点，AI 会自动优化为对话格式。也可以跳过 AI 直接手动保存。
    </p>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
      {{ error }}
    </div>

    <!-- 预览模式 -->
    <div v-if="preview" class="space-y-4">
      <div class="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h3 class="font-medium text-blue-800 mb-3">预览 & 编辑</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">问题标题</label>
            <input v-model="previewQuestion" class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">难度</label>
            <select v-model="previewDifficulty" class="px-3 py-2 rounded border border-gray-300 text-sm">
              <option>初级</option>
              <option>中级</option>
              <option>高级</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">对话内容（Markdown）</label>
            <textarea v-model="previewDialog" rows="12" class="w-full px-3 py-2 rounded border border-gray-300 text-sm font-mono resize-y focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
          </div>
        </div>

        <!-- 渲染预览 -->
        <div class="mt-3 p-3 bg-white rounded border border-gray-200">
          <p class="text-xs text-gray-400 mb-2">渲染预览：</p>
          <div class="prose-content text-sm text-gray-700" v-html="renderMarkdown(previewDialog)"></div>
        </div>

        <div class="flex gap-3 mt-4">
          <button @click="handleSave" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors">
            保存到题库
          </button>
          <button @click="cancelPreview" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
            返回修改
          </button>
        </div>
      </div>
    </div>

    <!-- 输入表单 -->
    <form v-else @submit.prevent="handleOptimize" class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">面试问题</label>
        <input
          v-model="question"
          type="text"
          placeholder="例如：请解释 RAG 的核心流程及其解决了什么问题？"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">答案要点</label>
        <textarea
          v-model="answer"
          rows="8"
          placeholder="输入答案要点，可以是粗糙的笔记。AI 会优化为面试官-求职者对话格式。"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y"
        ></textarea>
        <p class="text-xs text-gray-400 mt-1 text-right">{{ answer.length }} 字</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
        <select
          v-model="selectedCategory"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          <option value="" disabled>选择分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="loading || !canSubmit"
          class="flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors"
          :class="loading || !canSubmit ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'"
        >
          {{ loading ? step : 'AI 优化' }}
        </button>
        <button
          type="button"
          @click="handleManualSave"
          :disabled="!canSubmit"
          class="px-4 py-3 rounded-lg font-medium transition-colors"
          :class="!canSubmit ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
        >
          跳过 AI，直接保存
        </button>
      </div>
    </form>
  </div>
</template>
