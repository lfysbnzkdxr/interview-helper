<script setup>
defineProps({
  current: {
    type: String,
    default: '全部',
  },
})

defineEmits(['change'])

const options = ['全部', '初级', '中级', '高级']
</script>

<template>
  <div class="flex items-center justify-center gap-2 mb-4">
    <button
      v-for="opt in options"
      :key="opt"
      @click="$emit('change', opt)"
      class="px-4 py-2 min-h-[36px] rounded-full text-sm font-medium transition-all duration-200"
      :class="current === opt
        ? 'bg-blue-500 text-white shadow-sm'
        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:text-blue-400'"
    >
      {{ opt }}
    </button>
  </div>
</template>
