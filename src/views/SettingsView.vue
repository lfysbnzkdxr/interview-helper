<script setup>
import ApiConfigSection from '../components/settings/ApiConfigSection.vue'
import CategorySection from '../components/settings/CategorySection.vue'
import DataSection from '../components/settings/DataSection.vue'
import CloudSyncSection from '../components/settings/CloudSyncSection.vue'
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8">
    <h2 class="text-xl font-bold text-gray-800">设置</h2>
    <ApiConfigSection />
    <CategorySection />
    <DataSection />
    <CloudSyncSection />
  </div>
</template>
