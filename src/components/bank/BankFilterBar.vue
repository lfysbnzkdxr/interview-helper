<script setup>
import { getDifficultyColor } from '../../utils/helpers.js'

defineProps({
  searchQuery: String,
  filterCategory: String,
  filterDifficulty: String,
  sortedCategories: Array,
  stats: Object,
})

defineEmits(['update:searchQuery', 'update:filterCategory', 'update:filterDifficulty'])
</script>

<template>
  <div>
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
        :value="searchQuery"
        @input="$emit('update:searchQuery', $event.target.value)"
        type="text"
        placeholder="搜索题目..."
        class="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
      />
      <select :value="filterCategory" @change="$emit('update:filterCategory', $event.target.value)" class="px-3 py-2 rounded-lg border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
        <option value="">全部分类</option>
        <option v-for="cat in sortedCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select :value="filterDifficulty" @change="$emit('update:filterDifficulty', $event.target.value)" class="px-3 py-2 rounded-lg border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
        <option value="">全部难度</option>
        <option>初级</option>
        <option>中级</option>
        <option>高级</option>
      </select>
    </div>
  </div>
</template>
