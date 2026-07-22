<script setup>
import { ref, computed, onMounted } from 'vue'
import CategoryTabs from '../components/browse/CategoryTabs.vue'
import QuestionList from '../components/browse/QuestionList.vue'
import { useQuestionsStore } from '../stores/questionsStore.js'

const { categories, questions, loading, load } = useQuestionsStore()

const activeCategoryId = ref(null)

const filteredQuestions = computed(() => {
  if (activeCategoryId.value === null) return questions.value
  return questions.value.filter(q => q.category_id === activeCategoryId.value)
})

function handleSelect(id) {
  activeCategoryId.value = id
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
        :categories="categories"
        :active-id="activeCategoryId"
        @select="handleSelect"
      />
    </div>

    <!-- 题目列表 -->
    <QuestionList :questions="filteredQuestions" />
  </div>
</template>
