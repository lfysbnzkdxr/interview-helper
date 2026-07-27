<script setup>
import { onMounted } from 'vue'
import PracticeCard from '../components/practice/PracticeCard.vue'
import NavButtons from '../components/practice/NavButtons.vue'
import DifficultyFilter from '../components/practice/DifficultyFilter.vue'
import ShortcutHint from '../components/practice/ShortcutHint.vue'
import { useQuestionQueue } from '../composables/useQuestionQueue.js'
import { useKeyboard } from '../composables/useKeyboard.js'
import { useQuestionBank } from '../stores/useQuestionBank.js'

const { loadError, reload } = useQuestionBank()

const {
  difficulty,
  isFlipped,
  loading,
  currentQuestion,
  queue,
  isFirst,
  isLast,
  progress,
  next,
  prev,
  flip,
  setDifficulty,
  loadData,
} = useQuestionQueue()

// 键盘快捷键
useKeyboard({
  onPrev: prev,
  onNext: next,
  onFlip: flip,
})

onMounted(() => loadData())
</script>

<template>
  <div class="w-[92%] md:w-full md:max-w-[640px] mx-auto">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center h-[50vh]">
      <p class="text-gray-400">加载题目中...</p>
    </div>

    <!-- 加载错误 -->
    <div v-else-if="loadError" class="text-center py-20">
      <p class="text-red-500 mb-4">{{ loadError }}</p>
      <button @click="reload" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!currentQuestion" class="text-center py-20">
      <p class="text-gray-400 mb-4">{{ queue.length === 0 ? '当前筛选条件下暂无题目' : '题库为空' }}</p>
      <router-link to="/create" class="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">去创建题目</router-link>
    </div>

    <template v-else>
    <!-- 难度筛选 -->
    <DifficultyFilter :current="difficulty" @change="setDifficulty" />

    <!-- 翻转卡片 -->
    <PracticeCard
      :question="currentQuestion"
      :is-flipped="isFlipped"
      @flip="flip"
    />

    <!-- 导航按钮 -->
    <NavButtons
      :is-first="isFirst"
      :is-last="isLast"
      :progress="progress"
      @prev="prev"
      @next="next"
    />

    <!-- 快捷键提示（仅电脑端） -->
    <ShortcutHint />
    </template>
  </div>
</template>
