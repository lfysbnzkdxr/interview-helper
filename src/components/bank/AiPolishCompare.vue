<script setup>
import { renderMarkdown } from '../../utils/markdown.js'

const props = defineProps({
  show: Boolean,
  originalDialog: String,
  polishedDialog: String,
  polishedDifficulty: String,
  compareEditSide: String,
})

const emit = defineEmits(['close', 'keep-original', 'keep-polished', 'update:compareEditSide'])
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="emit('close')">
      <div class="bg-white rounded-xl shadow-2xl w-[95vw] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden dark:bg-gray-800 dark:border dark:border-gray-700">
        <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">AI 润色对比</h3>
          <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 text-lg leading-none dark:text-gray-500 dark:hover:text-gray-300">&times;</button>
        </div>
        <div class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
          <div class="flex flex-col overflow-hidden">
            <div class="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between dark:bg-gray-700 dark:border-gray-600">
              <span class="text-xs font-medium text-gray-600 dark:text-gray-300">原文</span>
              <button @click="emit('update:compareEditSide', compareEditSide === 'original' ? null : 'original')"
                class="text-xs text-blue-600 hover:underline">{{ compareEditSide === 'original' ? '预览' : '编辑' }}</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <textarea v-if="compareEditSide === 'original'" :value="originalDialog" @input="emit('update:originalDialog', $event.target.value)" rows="12"
                class="w-full h-full min-h-[200px] px-3 py-2 rounded border border-gray-300 text-sm font-mono resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
              <div v-else class="prose-content text-sm text-gray-700 dark:text-gray-300" v-html="renderMarkdown(originalDialog)"></div>
            </div>
          </div>
          <div class="flex flex-col overflow-hidden">
            <div class="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between dark:bg-indigo-900/30 dark:border-indigo-800">
              <span class="text-xs font-medium text-indigo-700 dark:text-indigo-300">AI 润色</span>
              <button @click="emit('update:compareEditSide', compareEditSide === 'polished' ? null : 'polished')"
                class="text-xs text-blue-600 hover:underline">{{ compareEditSide === 'polished' ? '预览' : '编辑' }}</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <textarea v-if="compareEditSide === 'polished'" :value="polishedDialog" @input="emit('update:polishedDialog', $event.target.value)" rows="12"
                class="w-full h-full min-h-[200px] px-3 py-2 rounded border border-gray-300 text-sm font-mono resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
              <div v-else class="prose-content text-sm text-gray-700 dark:text-gray-300" v-html="renderMarkdown(polishedDialog)"></div>
            </div>
          </div>
        </div>
        <div class="px-5 py-3 border-t border-gray-200 flex justify-center gap-3 dark:border-gray-700">
          <button @click="emit('keep-original')"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">保留原文</button>
          <button @click="emit('keep-polished')"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600">采用润色结果</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
