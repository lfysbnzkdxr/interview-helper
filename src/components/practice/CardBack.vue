<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { renderMarkdown } from '../../utils/markdown.js'

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
})

defineEmits(['flip'])

const renderedDialog = computed(() => renderMarkdown(props.question.dialog))

const scrollContainer = ref(null)

watch(() => props.question, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = 0
    }
  })
})
</script>

<template>
  <div class="flex flex-col h-full p-4 md:p-6">
    <!-- 顶部：返回题目按钮 -->
    <div class="flex items-center justify-between mb-3 shrink-0">
      <span class="text-sm font-medium text-gray-500 dark:text-gray-400">参考回答</span>
      <button
        @click="$emit('flip')"
        class="px-3 py-1.5 min-h-[36px] text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      >
        ← 返回题目
      </button>
    </div>

    <!-- 对话内容（内部滚动） -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto rounded-lg bg-gray-50 p-4 prose-content dark:bg-gray-700">
      <div v-html="renderedDialog"></div>
    </div>
  </div>
</template>
