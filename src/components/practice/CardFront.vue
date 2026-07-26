<script setup>
import { getDifficultyColor } from '../../utils/helpers.js'

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
})

defineEmits(['flip'])
</script>

<template>
  <div class="flex flex-col h-full p-6">
    <!-- 标签区域 -->
    <div class="flex items-center gap-2 mb-4">
      <span
        class="px-2.5 py-0.5 rounded-full text-xs font-medium"
        :class="getDifficultyColor(question.difficulty)"
      >
        {{ question.difficulty }}
      </span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        {{ question.category }}
      </span>
    </div>

    <!-- 题目文本（垂直居中） -->
    <div class="flex-1 flex items-center justify-center">
      <p class="text-lg md:text-xl font-medium text-gray-800 text-center leading-relaxed">
        {{ question.question }}
      </p>
    </div>

    <!-- 查看答案按钮 -->
    <div class="mt-6">
      <button
        @click="$emit('flip')"
        class="w-full py-3 min-h-[44px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-xl transition-colors duration-200"
      >
        查看答案
      </button>
    </div>
  </div>
</template>
