<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionBank } from '../../stores/useQuestionBank.js'
import { testConnection, PROVIDER_PRESETS } from '../../services/llm.js'

const { getApiConfig, saveApiConfig } = useQuestionBank()

const apiConfig = ref({ providers: [], activeId: '' })
const testResult = ref(null)
const testing = ref(false)
const testingId = ref('')
const message = ref('')
const showAddMenu = ref(false)
const customProvider = ref({ name: '', baseUrl: '', models: '', apiFormat: 'openai' })
const showCustomForm = ref(false)
const visibleKeys = ref({})

onMounted(async () => {
  const config = await getApiConfig()
  apiConfig.value = (!config.providers) ? { providers: [], activeId: '' } : config
})

const activeProvider = computed(() =>
  apiConfig.value.providers.find(p => p.id === apiConfig.value.activeId)
)

function addFromPreset(preset) {
  if (apiConfig.value.providers.find(p => p.id === preset.id)) {
    message.value = `「${preset.name}」已存在`
    setTimeout(() => { message.value = '' }, 2000)
    return
  }
  apiConfig.value.providers.push({
    id: preset.id,
    name: preset.name,
    baseUrl: preset.baseUrl,
    apiKey: '',
    model: preset.models[0],
    models: preset.models,
    apiFormat: preset.apiFormat,
    temperature: 0.3,
    keyPlaceholder: preset.keyPlaceholder,
    needsProxy: preset.needsProxy || false,
  })
  if (!apiConfig.value.activeId) {
    apiConfig.value.activeId = preset.id
  }
  showAddMenu.value = false
}

function addCustomProvider() {
  const { name, baseUrl, models, apiFormat } = customProvider.value
  if (!name.trim() || !baseUrl.trim()) {
    message.value = '请填写名称和 API 地址'
    setTimeout(() => { message.value = '' }, 2000)
    return
  }
  const id = 'custom-' + Date.now()
  const modelList = models.split(',').map(m => m.trim()).filter(Boolean)
  apiConfig.value.providers.push({
    id,
    name: name.trim(),
    baseUrl: baseUrl.trim(),
    apiKey: '',
    model: modelList[0] || '',
    models: modelList.length ? modelList : [''],
    apiFormat,
    temperature: 0.3,
    keyPlaceholder: 'your-api-key',
  })
  if (!apiConfig.value.activeId) {
    apiConfig.value.activeId = id
  }
  customProvider.value = { name: '', baseUrl: '', models: '', apiFormat: 'openai' }
  showCustomForm.value = false
  showAddMenu.value = false
}

function removeProvider(id) {
  apiConfig.value.providers = apiConfig.value.providers.filter(p => p.id !== id)
  if (apiConfig.value.activeId === id) {
    apiConfig.value.activeId = apiConfig.value.providers[0]?.id || ''
  }
}

function setActive(id) {
  apiConfig.value.activeId = id
}

async function handleSaveConfig() {
  await saveApiConfig(apiConfig.value)
  message.value = 'API 配置已保存'
  setTimeout(() => { message.value = '' }, 3000)
}

async function handleTest(provider) {
  testing.value = true
  testingId.value = provider.id
  testResult.value = null
  try {
    await saveApiConfig(apiConfig.value)
    testResult.value = await testConnection(provider)
  } catch (e) {
    testResult.value = { success: false, error: e.message || '未知错误' }
  } finally {
    testing.value = false
    testingId.value = ''
  }
}
</script>

<template>
  <section class="bg-white rounded-lg border border-gray-200 p-5">
    <div v-if="message" class="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
      {{ message }}
    </div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-medium text-gray-800">AI 模型配置</h3>
      <button @click="showAddMenu = !showAddMenu" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">
        + 添加提供商
      </button>
    </div>

    <div v-if="showAddMenu" class="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <p class="text-sm text-gray-600 mb-2">选择预设：</p>
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          v-for="preset in PROVIDER_PRESETS" :key="preset.id"
          @click="addFromPreset(preset)"
          class="px-3 py-1.5 rounded-full text-sm border border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          {{ preset.name }}
        </button>
      </div>
      <button @click="showCustomForm = !showCustomForm" class="text-sm text-blue-600 hover:underline">
        {{ showCustomForm ? '收起自定义' : '自定义提供商...' }}
      </button>
      <div v-if="showCustomForm" class="mt-3 space-y-2">
        <input v-model="customProvider.name" placeholder="名称" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
        <input v-model="customProvider.baseUrl" placeholder="API 地址" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
        <input v-model="customProvider.models" placeholder="模型名（逗号分隔）" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
        <select v-model="customProvider.apiFormat" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
          <option value="openai">OpenAI 兼容格式</option>
          <option value="anthropic">Anthropic (Claude) 格式</option>
        </select>
        <button @click="addCustomProvider" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">确认添加</button>
      </div>
    </div>

    <div v-if="apiConfig.providers.length === 0" class="text-center py-8 text-gray-400 text-sm">
      还未添加任何提供商，请点击右上角「添加提供商」开始配置
    </div>

    <div v-for="provider in apiConfig.providers" :key="provider.id" class="mb-4 p-4 rounded-lg border transition-colors"
      :class="provider.id === apiConfig.activeId ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <input type="radio" :checked="provider.id === apiConfig.activeId" @change="setActive(provider.id)" class="w-4 h-4 text-blue-600" />
          <span class="font-medium text-sm text-gray-800">{{ provider.name }}</span>
          <span v-if="provider.id === apiConfig.activeId" class="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">当前使用</span>
        </div>
        <button @click="removeProvider(provider.id)" class="text-gray-400 hover:text-red-500 text-sm">删除</button>
      </div>
      <div class="space-y-3 pl-6">
        <div>
          <label class="block text-xs text-gray-500 mb-1">API Key</label>
          <div class="relative">
            <input v-model="provider.apiKey" :type="visibleKeys[provider.id] ? 'text' : 'password'"
              :placeholder="provider.keyPlaceholder || 'sk-...'"
              class="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <button type="button" @click="visibleKeys[provider.id] = !visibleKeys[provider.id]"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg v-if="!visibleKeys[provider.id]" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">模型</label>
            <select v-model="provider.model" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option v-for="m in provider.models" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Temperature</label>
            <input v-model.number="provider.temperature" type="number" min="0" max="2" step="0.1" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
        </div>
        <button @click="handleTest(provider)" :disabled="testing && testingId === provider.id"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
          {{ testing && testingId === provider.id ? '测试中...' : '测试连接' }}
        </button>
      </div>
    </div>

    <div v-if="testResult" class="mt-2 text-sm" :class="testResult.success ? 'text-green-600' : 'text-red-600'">
      {{ testResult.success ? '连接成功！' : '连接失败: ' + testResult.error }}
    </div>

    <div class="mt-4">
      <button @click="handleSaveConfig" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">保存配置</button>
    </div>
  </section>
</template>
