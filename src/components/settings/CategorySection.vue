<script setup>
import { ref, onMounted } from 'vue'
import { useQuestionBank } from '../../stores/useQuestionBank.js'

const { allQuestions: questions, getCategories, saveCategories, updateQuestion } = useQuestionBank()

const cats = ref([])
const newCategory = ref('')
const message = ref('')

onMounted(async () => {
  cats.value = await getCategories()
})

async function addCategory() {
  const name = newCategory.value.trim()
  if (!name) return
  if (cats.value.includes(name)) { message.value = '分类已存在'; return }
  cats.value.push(name)
  await saveCategories(cats.value)
  newCategory.value = ''
}

async function removeCategory(name) {
  if (name === '未分类') {
    message.value = '「未分类」为默认分类，不可删除'
    setTimeout(() => { message.value = '' }, 2000)
    return
  }
  const affected = questions.value.filter(q => q.category === name)
  const count = affected.length
  const msg = count > 0
    ? `分类「${name}」下有 ${count} 道题目，删除后这些题目将移至「未分类」。确定删除？`
    : `确定删除分类「${name}」？`
  if (!confirm(msg)) return
  if (count > 0) {
    if (!cats.value.includes('未分类')) {
      cats.value.push('未分类')
    }
    for (const q of affected) {
      await updateQuestion(q.id, { category: '未分类' })
    }
  }
  cats.value = cats.value.filter(c => c !== name)
  const sorted = cats.value.filter(c => c !== '未分类')
  if (cats.value.includes('未分类')) sorted.push('未分类')
  cats.value = sorted
  await saveCategories(cats.value)
}
</script>

<template>
  <section class="bg-white rounded-lg border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
    <div v-if="message" class="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
      {{ message }}
    </div>
    <h3 class="font-medium text-gray-800 dark:text-gray-100 mb-4">分类管理</h3>
    <div class="flex flex-wrap gap-2 mb-3">
      <span v-for="cat in cats" :key="cat" class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
        {{ cat }}
        <button @click="removeCategory(cat)" class="text-blue-400 hover:text-red-500 font-bold">&times;</button>
      </span>
    </div>
    <div class="flex gap-2">
      <input v-model="newCategory" type="text" placeholder="新分类名称" class="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" @keyup.enter="addCategory" />
      <button @click="addCategory" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">添加</button>
    </div>
  </section>
</template>
