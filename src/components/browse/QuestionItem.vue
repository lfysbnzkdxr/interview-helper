<script setup>
import { ref, computed } from 'vue'
import { renderMarkdown } from '../../utils/markdown.js'
import { getDifficultyColor } from '../../utils/helpers.js'

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
})

const isExpanded = ref(false)

const renderedDialog = computed(() => renderMarkdown(props.question.dialog))
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
    <!-- 题目摘要 -->
    <div class="p-4 md:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span
              class="px-2 py-0.5 rounded-full text-xs font-medium"
              :class="getDifficultyColor(question.difficulty)"
            >
              {{ question.difficulty }}
            </span>
          </div>
          <h3 class="text-base font-medium text-gray-800 leading-relaxed">
            {{ question.question }}
          </h3>
        </div>
        <button
          @click="isExpanded = !isExpanded"
          class="shrink-0 px-3 py-1.5 min-h-[36px] text-sm font-medium rounded-lg transition-colors"
          :class="isExpanded
            ? 'bg-gray-100 text-gray-600'
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'"
        >
          {{ isExpanded ? '收起' : '查看解析' }}
        </button>
      </div>
    </div>

    <!-- 展开的对话内容 -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[80vh] opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="max-h-[80vh] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="isExpanded" class="overflow-hidden">
        <div class="px-4 md:px-5 pb-4 md:pb-5">
          <div class="rounded-lg bg-gray-50 p-4 max-h-[60vh] overflow-y-auto prose-content">
            <div v-html="renderedDialog"></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
