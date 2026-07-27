<script setup>
defineProps({
  selectedCount: Number,
  sortedCategories: Array,
  batchCategory: String,
  showBatchNewCategory: Boolean,
  batchNewCategoryName: String,
})

const emit = defineEmits([
  'update:batchCategory',
  'update:batchNewCategoryName',
  'batch-hide',
  'batch-unhide',
  'batch-delete',
  'confirm-new-category',
  'cancel-new-category',
  'clear-selection',
])

function onCategoryChange(cat) {
  if (cat === '__new__') {
    emit('update:batchCategory', '')
    emit('update:showBatchNewCategory', true)
    return
  }
  emit('update:batchCategory', cat)
  emit('confirm-new-category', cat)
}
</script>

<template>
  <div v-if="selectedCount > 0" class="flex items-center gap-3 mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200 flex-wrap dark:bg-yellow-900/30 dark:border-yellow-800">
    <span class="text-sm text-yellow-700 dark:text-yellow-400">已选 {{ selectedCount }} 题</span>
    <select :value="batchCategory" @change="onCategoryChange($event.target.value)" class="px-2 py-1 rounded text-xs border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
      <option value="" disabled>移动到分类...</option>
      <option v-for="cat in sortedCategories" :key="cat" :value="cat">{{ cat }}</option>
      <option value="__new__">+ 新建分类...</option>
    </select>
    <div v-if="showBatchNewCategory" class="flex items-center gap-1">
      <input
        :value="batchNewCategoryName"
        @input="emit('update:batchNewCategoryName', $event.target.value)"
        @keyup.enter="emit('confirm-new-category')"
        placeholder="新分类名称"
        class="px-2 py-1 rounded text-xs border border-gray-300 w-28 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        autofocus
      />
      <button @click="emit('confirm-new-category')" class="px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600">确定</button>
      <button @click="emit('cancel-new-category')" class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">取消</button>
    </div>
    <button @click="emit('batch-hide')" class="px-3 py-1 rounded text-xs font-medium bg-gray-500 text-white hover:bg-gray-600">批量隐藏</button>
    <button @click="emit('batch-unhide')" class="px-3 py-1 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600">取消隐藏</button>
    <button @click="emit('batch-delete')" class="px-3 py-1 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600">批量删除</button>
    <button @click="emit('clear-selection')" class="px-3 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">取消选择</button>
  </div>
</template>
