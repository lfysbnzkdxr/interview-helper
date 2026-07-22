<script setup>
defineProps({
  categories: {
    type: Array,
    required: true,
  },
  activeId: {
    type: Number,
    default: null,
  },
})

defineEmits(['select'])
</script>

<template>
  <div class="overflow-x-auto scrollbar-hide -mx-4 px-4">
    <div class="flex gap-1 min-w-max">
      <button
        @click="$emit('select', null)"
        class="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200"
        :class="activeId === null
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        全部
      </button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="$emit('select', cat.id)"
        class="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200"
        :class="activeId === cat.id
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        {{ cat.display_name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
