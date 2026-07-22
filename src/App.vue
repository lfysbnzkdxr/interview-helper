<script setup>
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />
    <main class="max-w-4xl mx-auto px-4 py-4 md:py-6">
      <router-view />
    </main>
  </div>
</template>
