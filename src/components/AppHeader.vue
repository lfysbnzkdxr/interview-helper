<script setup>
import { useDarkMode } from '../composables/useDarkMode.js'

const { isDark, toggle } = useDarkMode()
</script>

<template>
  <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 dark:bg-gray-800 dark:border-gray-700">
    <div class="max-w-4xl mx-auto px-4 py-3 md:py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">AI 面试备题</h1>
        <div class="flex items-center gap-1">
          <button
            @click="toggle"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            :title="isDark ? '切换亮色模式' : '切换深色模式'"
          >
            <!-- 太阳图标（亮色模式） -->
            <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
            </svg>
            <!-- 月亮图标（深色模式） -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </button>
          <router-link
            to="/settings"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="设置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </router-link>
        </div>
      </div>
      <nav class="flex justify-center gap-2 md:gap-3 mt-2 md:mt-3">
        <router-link
          to="/"
          class="px-3 md:px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'"
        >
          随机练题
        </router-link>
        <router-link
          to="/browse"
          class="px-3 md:px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/browse' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'"
        >
          分类浏览
        </router-link>
        <router-link
          to="/create"
          class="px-3 md:px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/create' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'"
        >
          创建问答
        </router-link>
        <router-link
          to="/bank"
          class="px-3 md:px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/bank' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'"
        >
          题库管理
        </router-link>
      </nav>
    </div>
  </header>
</template>
