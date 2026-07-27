<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionBank } from '../stores/useQuestionBank.js'
import { testConnection, PROVIDER_PRESETS } from '../services/llm.js'
import { parseSyncCodeFromHash } from '../services/cloud-sync.js'
import { renderMarkdown } from '../utils/markdown.js'
import { useToast } from '../composables/useToast.js'
import { useConfirm } from '../composables/useConfirm.js'
import ConfirmModal from '../components/ui/ConfirmModal.vue'

const { questions, loadError, load, reload, getApiConfig, saveApiConfig, getCategories, saveCategories, updateQuestion, exportData, importData, resetToDefault, createMigration, previewCloudData, restoreFromCloud, detectMergeConflicts, applyMergeDecisions } = useQuestionBank()
const { show } = useToast()
const { confirm } = useConfirm()

const apiConfig = ref({ providers: [], activeId: '' })
const cats = ref([])
const newCategory = ref('')
const testResult = ref(null)
const testing = ref(false)
const testingId = ref('')
const showAddMenu = ref(false)
const customProvider = ref({ name: '', baseUrl: '', models: '', apiFormat: 'openai' })
const showCustomForm = ref(false)
const visibleKeys = ref({})

// 云迁移相关状态
const migrating = ref(false)
const migrationResult = ref(null) // { code, link, syncedAt, expiresIn }
const downloadCode = ref('')
const downloading = ref(false)
const previewData = ref(null) // { preview, _raw }
const previewLoading = ref(false)
const codeCopied = ref(false)
const linkCopied = ref(false)

// 合并冲突解决相关状态
const mergeConflicts = ref([])   // [{ local, cloud }]
const mergeNewQuestions = ref([]) // 无冲突新题
const conflictDecisions = ref([]) // ['local'|'cloud'|'both']
const expandedConflict = ref(null) // 展开查看答案的索引
const mergeApplying = ref(false)

onMounted(async () => {
  await load()
  const config = await getApiConfig()
  // 兼容旧格式迁移
  if (!config.providers) {
    apiConfig.value = { providers: [], activeId: '' }
  } else {
    apiConfig.value = config
  }
  cats.value = await getCategories()
  // 解析 URL hash 中的同步码
  const hashCode = parseSyncCodeFromHash()
  if (hashCode) {
    downloadCode.value = hashCode
  }
})

const activeProvider = computed(() =>
  apiConfig.value.providers.find(p => p.id === apiConfig.value.activeId)
)

function addFromPreset(preset) {
  // 检查是否已添加
  if (apiConfig.value.providers.find(p => p.id === preset.id)) {
    show(`「${preset.name}」已存在`, 'warning')
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
    show('请填写名称和 API 地址', 'error')
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
  show('API 配置已保存', 'success')
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

async function addCategory() {
  const name = newCategory.value.trim()
  if (!name) return
  if (cats.value.includes(name)) { show('分类已存在', 'warning'); return }
  cats.value.push(name)
  await saveCategories(cats.value)
  newCategory.value = ''
}

async function removeCategory(name) {
  if (name === '未分类') {
    show('「未分类」为默认分类，不可删除', 'warning')
    return
  }
  const affected = questions.value.filter(q => q.category === name)
  const count = affected.length
  const msg = count > 0
    ? `分类「${name}」下有 ${count} 道题目，删除后这些题目将移至「未分类」。确定删除？`
    : `确定删除分类「${name}」？`
  if (!await confirm({ title: '删除分类', message: msg, danger: true })) return
  // 将关联题目迁移到「未分类」
  if (count > 0) {
    if (!cats.value.includes('未分类')) {
      cats.value.push('未分类')
    }
    for (const q of affected) {
      await updateQuestion(q.id, { category: '未分类' })
    }
  }
  cats.value = cats.value.filter(c => c !== name)
  // 保证「未分类」始终排在最后
  const sorted = cats.value.filter(c => c !== '未分类')
  if (cats.value.includes('未分类')) sorted.push('未分类')
  cats.value = sorted
  await saveCategories(cats.value)
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
      const mode = await confirm({ title: '选择导入模式', message: '点击"确定"覆盖现有数据，点击"取消"合并到现有数据' }) ? 'overwrite' : 'merge'
      await importData(text, mode)
      show('导入成功', 'success')
    } catch (err) {
      show('导入失败: ' + err.message, 'error')
    }
  }
  input.click()
}

async function handleReset() {
  if (!await confirm({ title: '重置确认', message: '确定重置为默认题库？所有自定义题目将被清除。', danger: true })) return
  await resetToDefault()
  cats.value = await getCategories()
  show('已重置为默认题库', 'success')
}

// ===== 云迁移操作 =====

async function handleCreateMigration(ttl) {
  migrating.value = true
  migrationResult.value = null
  try {
    const result = await createMigration(ttl)
    if (result.success) {
      migrationResult.value = result
    } else {
      show('上传失败: ' + result.error, 'error')
    }
  } catch (e) {
    show('上传失败: ' + e.message, 'error')
  } finally {
    migrating.value = false
  }
}

async function handleCopyCode() {
  if (!migrationResult.value) return
  try {
    await navigator.clipboard.writeText(migrationResult.value.code)
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  } catch {
    const input = document.createElement('input')
    input.value = migrationResult.value.code
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  }
}

async function handleCopyLink() {
  if (!migrationResult.value) return
  try {
    await navigator.clipboard.writeText(migrationResult.value.link)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {
    const input = document.createElement('input')
    input.value = migrationResult.value.link
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  }
}

async function handlePreview() {
  const code = downloadCode.value.trim().toUpperCase()
  if (!code || code.length < 4) {
    show('请输入有效的迁移码', 'warning')
    return
  }
  previewLoading.value = true
  previewData.value = null
  try {
    const result = await previewCloudData(code)
    if (result.success) {
      previewData.value = result
    } else {
      show(result.error || '该迁移码无效或已过期', 'error')
    }
  } catch (e) {
    show('查询失败: ' + e.message, 'error')
  } finally {
    previewLoading.value = false
  }
}

async function handleRestore(mode) {
  if (!previewData.value?._raw) return

  if (mode === 'overwrite') {
    downloading.value = true
    try {
      const result = await restoreFromCloud(previewData.value._raw, 'overwrite')
      if (result.success) {
        show('已覆盖恢复成功', 'success')
        cats.value = await getCategories()
        previewData.value = null
        downloadCode.value = ''
      } else {
        show('恢复失败: ' + result.error, 'error')
      }
    } catch (e) {
      show('恢复失败: ' + e.message, 'error')
    } finally {
      downloading.value = false
    }
    return
  }

  // 合并模式：先检测冲突
  const { conflicts, newQuestions } = detectMergeConflicts(previewData.value._raw)
  if (conflicts.length === 0) {
    // 无冲突，直接合并
    downloading.value = true
    try {
      await applyMergeDecisions([], newQuestions, previewData.value._raw.categories)
      show('合并成功', 'success')
      cats.value = await getCategories()
      previewData.value = null
      downloadCode.value = ''
    } catch (e) {
      show('合并失败: ' + e.message, 'error')
    } finally {
      downloading.value = false
    }
  } else {
    // 有冲突，进入冲突解决流程
    mergeConflicts.value = conflicts
    mergeNewQuestions.value = newQuestions
    conflictDecisions.value = conflicts.map(() => 'local')
    expandedConflict.value = null
  }
}

function setAllDecisions(choice) {
  conflictDecisions.value = conflictDecisions.value.map(() => choice)
}

async function applyMerge() {
  mergeApplying.value = true
  try {
    const decisions = mergeConflicts.value.map((conflict, i) => ({
      conflict,
      choice: conflictDecisions.value[i],
    }))
    await applyMergeDecisions(decisions, mergeNewQuestions.value, previewData.value?._raw?.categories)
    const cloudCount = mergeNewQuestions.value.length
    const bothCount = conflictDecisions.value.filter(d => d === 'both').length
    show('合并完成', 'success')
    cats.value = await getCategories()
    previewData.value = null
    downloadCode.value = ''
    mergeConflicts.value = []
    mergeNewQuestions.value = []
  } catch (e) {
    show('合并失败: ' + e.message, 'error')
  } finally {
    mergeApplying.value = false
  }
}

function cancelMerge() {
  mergeConflicts.value = []
  mergeNewQuestions.value = []
  conflictDecisions.value = []
  expandedConflict.value = null
}

function formatExpiry(ttl) {
  if (ttl <= 600) return '10 分钟'
  return '24 小时'
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8">
    <h2 class="text-xl font-bold text-gray-800">设置</h2>

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
          <input v-model="customProvider.baseUrl" placeholder="API 地址（如：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions）" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <input v-model="customProvider.models" placeholder="模型名（逗号分隔，如：qwen-max,qwen-plus）" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <select v-model="customProvider.apiFormat" class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="openai">OpenAI 兼容格式</option>
            <option value="anthropic">Anthropic (Claude) 格式</option>
          </select>
          <p class="text-xs text-gray-400">支持的 API 域名：api.deepseek.com、open.bigmodel.cn、api.moonshot.cn、dashscope.aliyuncs.com、api.mimo.xiaomi.com、api.openai.com、api.anthropic.com</p>
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

    <!-- 云迁移 -->
    <section class="bg-white rounded-lg border border-gray-200 p-5">
      <h3 class="font-medium text-gray-800 mb-1">☁️ 云迁移</h3>
      <p class="text-xs text-gray-400 mb-4">生成临时迁移码，在另一台设备上输入即可同步数据。迁移码过期后自动失效。</p>

      <!-- 生成迁移码 -->
      <div class="mb-4">
        <label class="block text-xs text-gray-500 mb-2">上传当前数据并生成迁移码</label>
        <div class="flex flex-wrap gap-3">
          <button @click="handleCreateMigration(600)" :disabled="migrating" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
            {{ migrating ? '上传中...' : '⬆️ 生成迁移码（10分钟有效）' }}
          </button>
          <button @click="handleCreateMigration(86400)" :disabled="migrating" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
            {{ migrating ? '上传中...' : '⬆️ 生成迁移码（24小时有效）' }}
          </button>
        </div>
      </div>

      <!-- 迁移码结果 -->
      <div v-if="migrationResult" class="mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
        <p class="text-sm text-green-700 mb-2">✅ 数据已上传，迁移码将在 {{ formatExpiry(migrationResult.expiresIn) }}后失效</p>
        <div class="flex items-center gap-2 mb-3">
          <code class="flex-1 px-4 py-2.5 rounded-lg bg-white border border-green-200 text-lg font-mono font-bold tracking-widest text-center text-blue-700">{{ migrationResult.code }}</code>
          <button @click="handleCopyCode" class="px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap">
            {{ codeCopied ? '✓ 已复制' : '复制码' }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input :value="migrationResult.link" readonly class="flex-1 px-3 py-2 rounded-lg border border-green-200 text-xs text-gray-500 bg-white" />
          <button @click="handleCopyLink" class="px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap">
            {{ linkCopied ? '✓ 已复制' : '复制链接' }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2">在手机浏览器打开链接，可自动填充迁移码</p>
      </div>

      <!-- 分割线 -->
      <div class="border-t border-gray-100 my-4"></div>

      <!-- 从云端恢复 -->
      <div>
        <label class="block text-xs text-gray-500 mb-2">在新设备上恢复？输入迁移码</label>
        <div class="flex items-center gap-2 mb-3">
          <input
            v-model="downloadCode"
            type="text"
            placeholder="XXXX-XXXX"
            maxlength="32"
            class="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono tracking-wider uppercase focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button @click="handlePreview" :disabled="previewLoading" class="px-3 py-2 rounded-lg text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 whitespace-nowrap">
            {{ previewLoading ? '查询中...' : '⬇️ 查询' }}
          </button>
        </div>

        <!-- 预览结果 -->
        <div v-if="previewData" class="p-4 rounded-lg bg-orange-50 border border-orange-200">
          <p class="text-sm text-gray-700 mb-1">云端备份内容：</p>
          <p class="text-sm text-gray-600 mb-3">
            <span class="font-medium">{{ previewData.preview.categoryCount }}</span> 个分类，
            <span class="font-medium">{{ previewData.preview.questionCount }}</span> 道题目
          </p>
          <p class="text-xs text-gray-500 mb-3">你当前本地有 {{ questions.length }} 道题目</p>
          <div class="flex flex-wrap gap-2">
            <button @click="handleRestore('overwrite')" :disabled="downloading" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
              {{ downloading ? '恢复中...' : '覆盖本地数据' }}
            </button>
            <button @click="handleRestore('merge')" :disabled="downloading" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
              {{ downloading ? '恢复中...' : '合并到本地' }}
            </button>
            <button @click="previewData = null" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
              取消
            </button>
          </div>
        </div>

        <!-- 合并冲突解决 -->
        <div v-if="mergeConflicts.length > 0" class="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-medium text-amber-800">⚠️ 发现 {{ mergeConflicts.length }} 道重复题目（问题相同但答案可能不同）</p>
          </div>
          <p class="text-xs text-amber-600 mb-3">另有 {{ mergeNewQuestions.length }} 道新题目将直接导入。请逐条决定重复题目的处理方式：</p>

          <!-- 批量操作 -->
          <div class="flex flex-wrap gap-2 mb-4">
            <button @click="setAllDecisions('local')" class="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">全部保留本地</button>
            <button @click="setAllDecisions('cloud')" class="px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">全部用云端</button>
            <button @click="setAllDecisions('both')" class="px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200">全部保留</button>
          </div>

          <!-- 冲突列表 -->
          <div class="space-y-3 max-h-[400px] overflow-y-auto">
            <div v-for="(item, idx) in mergeConflicts" :key="idx" class="p-3 rounded-lg bg-white border border-amber-200">
              <p class="text-sm font-medium text-gray-800 mb-2">{{ item.local.question }}</p>

              <!-- 展开对比答案 -->
              <button @click="expandedConflict = expandedConflict === idx ? null : idx" class="text-xs text-blue-600 hover:underline mb-2">
                {{ expandedConflict === idx ? '收起答案对比' : '查看两边答案对比' }}
              </button>
              <div v-if="expandedConflict === idx" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <div class="p-2 rounded border border-gray-200 bg-gray-50">
                  <p class="text-xs font-medium text-gray-500 mb-1">📱 本地版本</p>
                  <div class="text-xs text-gray-700 prose-content max-h-[200px] overflow-y-auto" v-html="renderMarkdown(item.local.dialog)"></div>
                </div>
                <div class="p-2 rounded border border-blue-200 bg-blue-50/50">
                  <p class="text-xs font-medium text-blue-500 mb-1">☁️ 云端版本</p>
                  <div class="text-xs text-gray-700 prose-content max-h-[200px] overflow-y-auto" v-html="renderMarkdown(item.cloud.dialog)"></div>
                </div>
              </div>

              <!-- 单条决策 -->
              <div class="flex flex-wrap gap-2">
                <label class="flex items-center gap-1 text-xs cursor-pointer" :class="conflictDecisions[idx] === 'local' ? 'text-gray-800 font-medium' : 'text-gray-500'">
                  <input type="radio" :value="'local'" v-model="conflictDecisions[idx]" class="w-3 h-3" /> 保留本地
                </label>
                <label class="flex items-center gap-1 text-xs cursor-pointer" :class="conflictDecisions[idx] === 'cloud' ? 'text-blue-700 font-medium' : 'text-gray-500'">
                  <input type="radio" :value="'cloud'" v-model="conflictDecisions[idx]" class="w-3 h-3" /> 用云端
                </label>
                <label class="flex items-center gap-1 text-xs cursor-pointer" :class="conflictDecisions[idx] === 'both' ? 'text-green-700 font-medium' : 'text-gray-500'">
                  <input type="radio" :value="'both'" v-model="conflictDecisions[idx]" class="w-3 h-3" /> 都保留
                </label>
              </div>
            </div>
          </div>

          <!-- 确认按钮 -->
          <div class="flex gap-2 mt-4">
            <button @click="applyMerge" :disabled="mergeApplying" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
              {{ mergeApplying ? '合并中...' : '确认合并' }}
            </button>
            <button @click="cancelMerge" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">取消</button>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- 加载错误弹窗 -->
  <Teleport to="body">
    <div v-if="loadError" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="reload">
      <div class="bg-white rounded-xl shadow-2xl w-[90vw] max-w-sm p-6">
        <h3 class="text-base font-bold text-gray-800 mb-2">数据加载失败</h3>
        <p class="text-sm text-gray-600 mb-6">{{ loadError }}</p>
        <div class="flex justify-end">
          <button @click="reload" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">重试</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 确认对话框 -->
  <ConfirmModal />
</template>
