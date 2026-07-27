<script setup>
import { useQuestionBank } from '../stores/useQuestionBank.js'
import ConfirmModal from '../components/ui/ConfirmModal.vue'
import ApiConfigSection from '../components/settings/ApiConfigSection.vue'
import CategorySection from '../components/settings/CategorySection.vue'
import DataSection from '../components/settings/DataSection.vue'
import CloudSyncSection from '../components/settings/CloudSyncSection.vue'

const { loadError, reload } = useQuestionBank()
</script>

<template>
  <div>
    <div class="max-w-2xl mx-auto space-y-8">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">设置</h2>
      <ApiConfigSection />
      <CategorySection />
      <DataSection />
      <CloudSyncSection />
    </div>

    <!-- 加载错误弹窗 -->
    <Teleport to="body">
      <div v-if="loadError" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="reload">
        <div class="bg-white rounded-xl shadow-2xl w-[90vw] max-w-sm p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
          <h3 class="text-base font-bold text-gray-800 mb-2">数据加载失败</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">{{ loadError }}</p>
          <div class="flex justify-end">
            <button @click="reload" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">重试</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认对话框 -->
    <ConfirmModal />
  </div>
</template>
