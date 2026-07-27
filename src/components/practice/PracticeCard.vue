<script setup>
import CardFront from './CardFront.vue'
import CardBack from './CardBack.vue'

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  isFlipped: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['flip'])
</script>

<template>
  <div class="card-container w-full h-[65vh] min-h-[400px] max-h-[600px]">
    <div class="card-inner" :class="{ flipped: isFlipped }">
      <!-- 正面 -->
      <div class="card-face card-front bg-white rounded-2xl shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <CardFront :question="question" @flip="emit('flip')" />
      </div>
      <!-- 背面 -->
      <div class="card-face card-back bg-white rounded-2xl shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <CardBack :question="question" @flip="emit('flip')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  perspective: 1000px;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  will-change: transform;
}

.card-inner.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
}

.card-back {
  transform: rotateY(180deg);
}
</style>
