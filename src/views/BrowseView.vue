<script setup>
import { ref, computed, onMounted } from 'vue'
import CategoryTabs from '../components/browse/CategoryTabs.vue'
import QuestionList from '../components/browse/QuestionList.vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'

const { questions, categories, loading, load } = useQuestionBank()

const activeCategory = ref(null)

// 将分类字符串数组转为 CategoryTabs 需要的格式
const categoryList = computed(() => categories.value.map((name, i) => ({ id: i + 1, display_name: name })))

const filteredQuestions = computed(() => {
  if (activeCategory.value === null) return questions.value
  const catName = categories.value[activeCategory.value - 1]
  return questions.value.filter(q => q.category === catName)
})

function handleSelect(id) {
  activeCategory.value = id
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="w-[92%] md:w-full md:max-w-[720px] mx-auto">
    <!-- 分类 Tab -->
    <div class="border-b border-gray-200 mb-4">
      <CategoryTabs
        :categories="categoryList"
        :active-id="activeCategory"
        @select="handleSelect"
      />
    </div>

    <!-- 题目列表 -->
    <QuestionList :questions="filteredQuestions" />
  </div>
</template>
