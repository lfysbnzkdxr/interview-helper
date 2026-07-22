<script setup>
import { ref } from 'vue'
import { submitQuestion } from '../api/index.js'
import { useQuestionsStore } from '../stores/questionsStore.js'

const { load } = useQuestionsStore()

const question = ref('')
const answer = ref('')
const loading = ref(false)
const result = ref(null)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  result.value = null

  if (!question.value.trim()) {
    error.value = '请输入面试问题'
    return
  }
  if (!answer.value.trim()) {
    error.value = '请输入答案内容'
    return
  }

  loading.value = true
  try {
    const res = await submitQuestion({
      question: question.value.trim(),
      answer: answer.value.trim(),
    })
    if (res.error) {
      error.value = res.error
    } else {
      result.value = res
      question.value = ''
      answer.value = ''
      // 提交成功（已上线）后强制刷新缓存，让用户立即看到新题目
      if (res.success) load(true)
    }
  } catch (e) {
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-xl font-bold text-gray-800 mb-2">提交面试问答</h2>
    <p class="text-sm text-gray-500 mb-6">
      提交后由 AI 自动判断分类、难度并优化排版，质量达标将直接上线展示。
    </p>

    <!-- 结果反馈 -->
    <div
      v-if="result"
      class="mb-6 p-4 rounded-lg"
      :class="result.success ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'"
    >
      <p class="font-medium" :class="result.success ? 'text-green-700' : 'text-orange-700'">
        {{ result.message }}
      </p>
      <div v-if="result.success" class="mt-2 text-sm text-gray-600 space-y-1">
        <p>质量评分：{{ result.quality_score }} 分</p>
        <p>AI 判定难度：{{ result.difficulty }}</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
      <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- 表单 -->
    <form @submit.prevent="handleSubmit" class="space-y-5">
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
        <label class="block text-sm font-medium text-gray-700 mb-1">答案内容</label>
        <textarea
          v-model="answer"
          rows="10"
          placeholder="输入你的答案，支持 Markdown 格式。AI 会自动优化为面试官-求职者对话格式。"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y"
        ></textarea>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full py-3 px-4 rounded-lg font-medium text-white transition-colors"
        :class="loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'"
      >
        {{ loading ? 'AI 处理中...' : '提交' }}
      </button>
    </form>
  </div>
</template>
