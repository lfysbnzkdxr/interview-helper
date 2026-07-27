<script setup>
import QuestionItem from './QuestionItem.vue'

defineProps({
  questions: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <div class="space-y-3">
    <QuestionItem
      v-for="q in questions"
      :key="q.id"
      :question="q"
    />

    <!-- 空状态 -->
    <div v-if="questions.length === 0" class="text-center py-12">
      <p class="text-gray-400 dark:text-gray-500">该分类下暂无题目</p>
    </div>
  </div>
</template>
