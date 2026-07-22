<script setup>
import { ref, onMounted } from 'vue'
import { login, fetchPending, reviewQuestion } from '../api/index.js'
import { renderMarkdown } from '../utils/markdown.js'

const isLoggedIn = ref(false)
const checkingAuth = ref(true)
const loginForm = ref({ username: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

const pendingList = ref([])
const listLoading = ref(false)
const expandedId = ref(null)

onMounted(async () => {
  await loadPending()
})

async function loadPending() {
  checkingAuth.value = true
  listLoading.value = true
  try {
    const res = await fetchPending()
    if (res.unauthorized) {
      isLoggedIn.value = false
    } else {
      isLoggedIn.value = true
      pendingList.value = res.questions || []
    }
  } catch {
    isLoggedIn.value = false
  } finally {
    checkingAuth.value = false
    listLoading.value = false
  }
}

async function handleLogin() {
  loginError.value = ''
  if (!loginForm.value.username || !loginForm.value.password) {
    loginError.value = '请输入用户名和密码'
    return
  }
  loginLoading.value = true
  try {
    const res = await login(loginForm.value)
    if (res.error) {
      loginError.value = res.error
    } else {
      isLoggedIn.value = true
      loginForm.value = { username: '', password: '' }
      await loadPending()
    }
  } catch {
    loginError.value = '网络错误，请重试'
  } finally {
    loginLoading.value = false
  }
}

async function handleReview(id, action) {
  try {
    const res = await reviewQuestion({ id, action })
    if (res.success) {
      pendingList.value = pendingList.value.filter(q => q.id !== id)
    }
  } catch {
    // ignore
  }
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function getDifficultyColor(difficulty) {
  const colors = { '初级': 'bg-green-100 text-green-700', '中级': 'bg-yellow-100 text-yellow-700', '高级': 'bg-red-100 text-red-700' }
  return colors[difficulty] || 'bg-gray-100 text-gray-700'
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- 登录表单 -->
    <div v-if="!checkingAuth && !isLoggedIn" class="max-w-sm mx-auto mt-10">
      <h2 class="text-xl font-bold text-gray-800 mb-6 text-center">管理员登录</h2>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div v-if="loginError" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {{ loginError }}
        </div>
        <input
          v-model="loginForm.username"
          type="text"
          placeholder="用户名"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <input
          v-model="loginForm.password"
          type="password"
          placeholder="密码"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          :disabled="loginLoading"
          class="w-full py-3 rounded-lg font-medium text-white transition-colors"
          :class="loginLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'"
        >
          {{ loginLoading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>

    <!-- 审核列表 -->
    <div v-else-if="isLoggedIn">
      <h2 class="text-xl font-bold text-gray-800 mb-4">待审核题目</h2>

      <div v-if="listLoading" class="text-center py-10 text-gray-400">加载中...</div>
      <div v-else-if="pendingList.length === 0" class="text-center py-10 text-gray-400">
        暂无待审核题目
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in pendingList"
          :key="item.id"
          class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        >
          <div class="p-4 cursor-pointer" @click="toggleExpand(item.id)">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="getDifficultyColor(item.difficulty)">
                {{ item.difficulty }}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {{ item.category_name }}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                评分: {{ item.quality_score }}
              </span>
            </div>
            <h3 class="mt-2 font-medium text-gray-800">{{ item.question }}</h3>
            <p class="text-xs text-gray-400 mt-1">{{ item.created_at }}</p>
          </div>

          <!-- 展开的答案 -->
          <div v-if="expandedId === item.id" class="px-4 pb-4 border-t border-gray-100">
            <div class="prose-content mt-3 text-sm text-gray-700" v-html="renderMarkdown(item.dialog)"></div>
          </div>

          <!-- 操作按钮 -->
          <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              @click="handleReview(item.id, 'approve')"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              通过
            </button>
            <button
              @click="handleReview(item.id, 'reject')"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else class="text-center py-10 text-gray-400">验证身份中...</div>
  </div>
</template>
