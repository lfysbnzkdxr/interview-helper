<script setup>
import { ref } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    required: true,
  },
  activeId: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['select', 'reorder'])

const dragIndex = ref(null)
const dragOverIndex = ref(null)

function onDragStart(index) {
  dragIndex.value = index
}

function onDragOver(e, index) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDrop(index) {
  const from = dragIndex.value
  const to = index
  if (from === null || from === to) {
    dragIndex.value = null
    dragOverIndex.value = null
    return
  }
  // 生成新顺序的名称数组
  const names = props.categories.map(c => c.display_name)
  const [moved] = names.splice(from, 1)
  names.splice(to, 0, moved)
  emit('reorder', names)
  dragIndex.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}
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
        v-for="(cat, index) in categories"
        :key="cat.id"
        draggable="true"
        @click="$emit('select', cat.id)"
        @dragstart="onDragStart(index)"
        @dragover="onDragOver($event, index)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
        class="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 cursor-grab active:cursor-grabbing select-none"
        :class="[
          activeId === cat.id
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700',
          dragOverIndex === index && dragIndex !== null && dragIndex !== index
            ? 'bg-blue-50 rounded'
            : '',
          dragIndex === index ? 'opacity-40' : '',
        ]"
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
