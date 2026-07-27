<script setup>
import { useConfirm } from '../../composables/useConfirm.js'

const { confirmState, handleConfirm, handleCancel } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <div v-if="confirmState" class="fixed inset-0 z-[9998] flex items-center justify-center" @click.self="handleCancel">
      <div class="fixed inset-0 bg-black/40"></div>
      <div class="relative bg-white rounded-xl shadow-2xl w-[90vw] max-w-sm p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">{{ confirmState.title }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">{{ confirmState.message }}</p>
        <div class="flex justify-end gap-3">
          <button
            @click="handleCancel"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
          >
            {{ confirmState.cancelText }}
          </button>
          <button
            @click="handleConfirm"
            class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            :class="confirmState.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'"
          >
            {{ confirmState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
