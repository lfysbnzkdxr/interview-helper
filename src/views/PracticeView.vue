<script setup>
import PracticeCard from '../components/practice/PracticeCard.vue'
import NavButtons from '../components/practice/NavButtons.vue'
import DifficultyFilter from '../components/practice/DifficultyFilter.vue'
import ShortcutHint from '../components/practice/ShortcutHint.vue'
import { useQuestionQueue } from '../composables/useQuestionQueue.js'
import { useKeyboard } from '../composables/useKeyboard.js'

const {
  difficulty,
  isFlipped,
  loading,
  currentQuestion,
  isFirst,
  isLast,
  progress,
  next,
  prev,
  flip,
  setDifficulty,
} = useQuestionQueue()

// 键盘快捷键
useKeyboard({
  onPrev: prev,
  onNext: next,
  onFlip: flip,
})
</script>

<template>
  <div class="w-[92%] md:w-full md:max-w-[640px] mx-auto">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center h-[50vh]">
      <p class="text-gray-400">加载题目中...</p>
    </div>

    <template v-else>
    <!-- 难度筛选 -->
    <DifficultyFilter :current="difficulty" @change="setDifficulty" />

    <!-- 翻转卡片 -->
    <PracticeCard
      v-if="currentQuestion"
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
