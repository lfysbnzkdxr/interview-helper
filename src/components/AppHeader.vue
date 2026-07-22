<script setup>
</script>

<template>
  <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-3 md:py-4">
      <h1 class="text-lg md:text-xl font-bold text-gray-800 text-center">AI 面经聚合平台</h1>
      <nav class="flex justify-center gap-3 md:gap-4 mt-2 md:mt-3">
        <router-link
          to="/"
          class="px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          随机练题
        </router-link>
        <router-link
          to="/browse"
          class="px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/browse' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          分类浏览
        </router-link>
        <router-link
          to="/submit"
          class="px-4 py-2 min-h-[36px] rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/submit' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          提交题目
        </router-link>
      </nav>
    </div>
  </header>
</template>
