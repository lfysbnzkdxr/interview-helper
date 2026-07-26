<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { testConnection, PROVIDER_PRESETS } from '../services/llm.js'

const { getApiConfig, saveApiConfig, getCategories, saveCategories, exportData, importData, resetToDefault } = useQuestionBank()

const apiConfig = ref({ providers: [], activeId: '', proxyUrl: '' })
const cats = ref([])
const newCategory = ref('')
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
  // 兼容旧格式迁移
  if (!config.providers) {
    apiConfig.value = { providers: [], activeId: '', proxyUrl: config.proxyUrl || '' }
  } else {
    apiConfig.value = config
  }
  cats.value = await getCategories()
})

const activeProvider = computed(() =>
  apiConfig.value.providers.find(p => p.id === apiConfig.value.activeId)
)

function addFromPreset(preset) {
  // 检查是否已添加
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
    testResult.value = await testConnection({ ...provider, proxyUrl: apiConfig.value.proxyUrl || '' })
  } catch (e) {
    testResult.value = { success: false, error: e.message || '未知错误' }
  } finally {
    testing.value = false
    testingId.value = ''
  }
}

function addCategory() {
  const name = newCategory.value.trim()
  if (!name) return
  if (cats.value.includes(name)) { message.value = '分类已存在'; return }
  cats.value.push(name)
  saveCategories(cats.value)
  newCategory.value = ''
}

function removeCategory(name) {
  cats.value = cats.value.filter(c => c !== name)
  saveCategories(cats.value)
}

async function handleExport() {
  const json = await exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview-helper-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    try {
      const mode = confirm('点击"确定"覆盖现有数据，点击"取消"合并到现有数据') ? 'overwrite' : 'merge'
      await importData(text, mode)
      message.value = '导入成功'
      setTimeout(() => { message.value = '' }, 3000)
    } catch (err) {
      message.value = '导入失败: ' + err.message
    }
  }
  input.click()
}

async function handleReset() {
  if (!confirm('确定重置为默认题库？所有自定义题目将被清除。')) return
  await resetToDefault()
  cats.value = await getCategories()
  message.value = '已重置为默认题库'
  setTimeout(() => { message.value = '' }, 3000)
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8">
    <h2 class="text-xl font-bold text-gray-800">设置</h2>

    <!-- 提示消息 -->
    <div v-if="message" class="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
      {{ message }}
    </div>

    <!-- API 提供商配置 -->
    <section class="bg-white rounded-lg border border-gray-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium text-gray-800">AI 模型配置</h3>
        <button @click="showAddMenu = !showAddMenu" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">
          + 添加提供商
        </button>
      </div>

      <!-- 添加菜单 -->
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
          <input v-model="customProvider.name" placeholder="名称（如：通义千问）" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <input v-model="customProvider.baseUrl" placeholder="API 地址（如：https://xxx.com/v1/chat/completions）" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <input v-model="customProvider.models" placeholder="模型名（逗号分隔，如：qwen-max,qwen-plus）" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <select v-model="customProvider.apiFormat" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="openai">OpenAI 兼容格式</option>
            <option value="anthropic">Anthropic (Claude) 格式</option>
          </select>
          <button @click="addCustomProvider" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">确认添加</button>
        </div>
      </div>

      <!-- 提供商列表 -->
      <div v-if="apiConfig.providers.length === 0" class="text-center py-8 text-gray-400 text-sm">
        还未添加任何提供商，请点击右上角「添加提供商」开始配置
      </div>

      <div v-for="provider in apiConfig.providers" :key="provider.id" class="mb-4 p-4 rounded-lg border transition-colors" :class="provider.id === apiConfig.activeId ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'">
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
              <input
                v-model="provider.apiKey"
                :type="visibleKeys[provider.id] ? 'text' : 'password'"
                :placeholder="provider.keyPlaceholder || 'sk-...'"
                class="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                @paste.prevent="(e) => { provider.apiKey = (e.clipboardData.getData('text') || '').replace(/[^\x20-\x7E]/g, '').trim() }"
                @blur="provider.apiKey = (provider.apiKey || '').trim()"
              />
              <button
                type="button"
                @click="visibleKeys[provider.id] = !visibleKeys[provider.id]"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
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
          <button
            @click="handleTest(provider)"
            :disabled="testing && testingId === provider.id"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            {{ testing && testingId === provider.id ? '测试中...' : '测试连接' }}
          </button>
        </div>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult" class="mt-2 text-sm" :class="testResult.success ? 'text-green-600' : 'text-red-600'">
        {{ testResult.success ? '连接成功！' : '连接失败: ' + testResult.error }}
      </div>

      <!-- 代理设置 -->
      <div class="mt-4 pt-4 border-t border-gray-100">
        <label class="block text-sm text-gray-600 mb-1">CORS 代理地址（可选，全局生效）</label>
        <input
          v-model="apiConfig.proxyUrl"
          type="text"
          placeholder="https://ih-llm-proxy.xxx.workers.dev"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <p class="text-xs text-gray-400 mt-1">由于浏览器 CORS 限制，直连可能失败。建议配置代理地址。留空则尝试直连。</p>
      </div>

      <div class="mt-4">
        <button @click="handleSaveConfig" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">保存配置</button>
      </div>
    </section>

    <!-- 分类管理 -->
    <section class="bg-white rounded-lg border border-gray-200 p-5">
      <h3 class="font-medium text-gray-800 mb-4">分类管理</h3>
      <div class="flex flex-wrap gap-2 mb-3">
        <span v-for="cat in cats" :key="cat" class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
          {{ cat }}
          <button @click="removeCategory(cat)" class="text-blue-400 hover:text-red-500 font-bold">&times;</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="newCategory" type="text" placeholder="新分类名称" class="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" @keyup.enter="addCategory" />
        <button @click="addCategory" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">添加</button>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="bg-white rounded-lg border border-gray-200 p-5">
      <h3 class="font-medium text-gray-800 mb-4">数据管理</h3>
      <div class="flex flex-wrap gap-3">
        <button @click="handleExport" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200">导出 JSON</button>
        <button @click="handleImport" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">导入 JSON</button>
        <button @click="handleReset" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200">重置为默认题库</button>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        导出/导入可用于跨设备迁移数据。重置将清除所有自定义题目并恢复内置题目。
      </p>
    </section>
  </div>
</template>
