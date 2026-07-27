<script setup>
import { ref, computed, onMounted } from 'vue'
import CategoryTabs from '../components/browse/CategoryTabs.vue'
import QuestionList from '../components/browse/QuestionList.vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { DEFAULT_CATEGORY } from '../utils/constants.js'

const { visibleQuestions: questions, categories, loading, loadError, load, reload, saveCategories } = useQuestionBank()

const activeName = ref(null) // 当前选中分类名称，null 表示「全部」

// 分类排序：「未分类」始终排在最后
const sortedCategories = computed(() => {
  const cats = [...categories.value]
  return cats.sort((a, b) => {
    if (a === DEFAULT_CATEGORY) return 1
    if (b === DEFAULT_CATEGORY) return -1
    return 0
  })
})

// 将分类字符串数组转为 CategoryTabs 需要的格式
const categoryList = computed(() => sortedCategories.value.map((name, i) => ({ id: i + 1, display_name: name })))

// 根据名称反查当前 activeId（拖拽重排后 id 会变，需动态计算）
const activeId = computed(() => {
  if (activeName.value === null) return null
  const item = categoryList.value.find(c => c.display_name === activeName.value)
  return item ? item.id : null
})

const filteredQuestions = computed(() => {
  if (activeName.value === null) return questions.value
  return questions.value.filter(q => q.category === activeName.value)
})

function handleSelect(id) {
  if (id === null) {
    activeName.value = null
  } else {
    const item = categoryList.value.find(c => c.id === id)
    activeName.value = item ? item.display_name : null
  }
}

// 拖拽排序后持久化新顺序
async function handleReorder(names) {
  // 保证「未分类」始终在最后
  const sorted = names.filter(n => n !== DEFAULT_CATEGORY)
  if (names.includes(DEFAULT_CATEGORY)) sorted.push(DEFAULT_CATEGORY)
  await saveCategories(sorted)
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="w-[92%] md:w-full md:max-w-[720px] mx-auto">
    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-10 text-gray-400 dark:text-gray-500">加载中...</div>

    <!-- 加载错误 -->
    <div v-else-if="loadError" class="text-center py-20">
      <p class="text-red-500 mb-4">{{ loadError }}</p>
      <button @click="reload" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">重试</button>
    </div>

    <template v-else>
      <!-- 分类 Tab -->
      <div class="border-b border-gray-200 mb-4 dark:border-gray-700">
        <CategoryTabs
          :categories="categoryList"
          :active-id="activeId"
          @select="handleSelect"
          @reorder="handleReorder"
        />
      </div>

      <!-- 题目列表 -->
      <QuestionList :questions="filteredQuestions" />
    </template>
  </div>
</template>
