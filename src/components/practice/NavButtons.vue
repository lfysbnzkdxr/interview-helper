<script setup>
defineProps({
  isFirst: Boolean,
  isLast: Boolean,
  progress: String,
})

defineEmits(['prev', 'next'])
</script>

<template>
  <div class="flex items-center justify-between gap-4 mt-4">
    <button
      @click="$emit('prev')"
      :disabled="isFirst"
      class="flex-1 py-3 min-h-[44px] px-4 rounded-xl font-medium text-sm transition-colors duration-200"
      :class="isFirst
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'"
    >
      ← 上一题
    </button>

    <span class="text-sm text-gray-400 font-medium shrink-0">{{ progress }}</span>

    <button
      @click="$emit('next')"
      :disabled="isLast"
      class="flex-1 py-3 min-h-[44px] px-4 rounded-xl font-medium text-sm transition-colors duration-200"
      :class="isLast
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'"
    >
      下一题 →
    </button>
  </div>
</template>
