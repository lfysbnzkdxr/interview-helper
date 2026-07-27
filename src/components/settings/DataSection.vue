<script setup>
import { ref, onMounted } from 'vue'
import { useQuestionBank } from '../../stores/useQuestionBank.js'

const { load, exportData, importData, resetToDefault, getCategories } = useQuestionBank()

const message = ref('')

onMounted(() => { load() })

async function handleExport() {
  const json = await exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview-helper-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    try {
      const mode = confirm('点击"确定"覆盖现有数据，点击"取消"合并到现有数据') ? 'overwrite' : 'merge'
      await importData(text, mode)
      message.value = '导入成功'
      setTimeout(() => { message.value = '' }, 3000)
    } catch (err) {
      message.value = '导入失败: ' + err.message
    }
  }
  input.click()
}

async function handleReset() {
  if (!confirm('确定重置为默认题库？所有自定义题目将被清除。')) return
  await resetToDefault()
  message.value = '已重置为默认题库'
  setTimeout(() => { message.value = '' }, 3000)
}
</script>

<template>
  <section class="bg-white rounded-lg border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
    <div v-if="message" class="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
      {{ message }}
    </div>
    <h3 class="font-medium text-gray-800 dark:text-gray-100 mb-4">数据管理</h3>
    <div class="flex flex-wrap gap-3">
      <button @click="handleExport" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200">导出 JSON</button>
      <button @click="handleImport" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">导入 JSON</button>
      <button @click="handleReset" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200">重置为默认题库</button>
    </div>
    <p class="text-xs text-gray-400 dark:text-gray-500 mt-3">
      导出/导入可用于跨设备迁移数据。重置将清除所有自定义题目并恢复内置题目。
    </p>
  </section>
</template>
