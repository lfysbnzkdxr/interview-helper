<script setup>
</script>

<template>
  <!-- 仅电脑端显示 -->
  <div class="hidden md:flex items-center justify-center gap-6 mt-4 py-3 text-xs text-gray-400 dark:text-gray-500">
    <span class="flex items-center gap-1.5">
      <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">←</kbd>
      <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">→</kbd>
      切换题目
    </span>
    <span class="flex items-center gap-1.5">
      <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">Space</kbd>
      翻转卡片
    </span>
  </div>
</template>
