<script setup>
import { ref, onMounted } from 'vue'
import { useQuestionBank } from '../../stores/useQuestionBank.js'
import { parseSyncCodeFromHash } from '../../services/cloud-sync.js'
import { renderMarkdown } from '../../utils/markdown.js'

const { allQuestions: questions, load, createMigration, previewCloudData, restoreFromCloud, detectMergeConflicts, applyMergeDecisions, getCategories } = useQuestionBank()

const message = ref('')

// 云迁移状态
const migrating = ref(false)
const migrationResult = ref(null)
const downloadCode = ref('')
const downloading = ref(false)
const previewData = ref(null)
const previewLoading = ref(false)
const codeCopied = ref(false)
const linkCopied = ref(false)

// 合并冲突状态
const mergeConflicts = ref([])
const mergeNewQuestions = ref([])
const conflictDecisions = ref([])
const expandedConflict = ref(null)
const mergeApplying = ref(false)

onMounted(async () => {
  await load()
  const hashCode = parseSyncCodeFromHash()
  if (hashCode) {
    downloadCode.value = hashCode
  }
})

function formatExpiry(ttl) {
  if (ttl <= 600) return '10 分钟'
  return '24 小时'
}

async function handleCreateMigration(ttl) {
  migrating.value = true
  migrationResult.value = null
  try {
    const result = await createMigration(ttl)
    if (result.success) {
      migrationResult.value = result
    } else {
      message.value = '上传失败: ' + result.error
      setTimeout(() => { message.value = '' }, 4000)
    }
  } catch (e) {
    message.value = '上传失败: ' + e.message
    setTimeout(() => { message.value = '' }, 4000)
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
    message.value = '请输入有效的迁移码'
    setTimeout(() => { message.value = '' }, 2000)
    return
  }
  previewLoading.value = true
  previewData.value = null
  try {
    const result = await previewCloudData(code)
    if (result.success) {
      previewData.value = result
    } else {
      message.value = result.error || '该迁移码无效或已过期'
      setTimeout(() => { message.value = '' }, 4000)
    }
  } catch (e) {
    message.value = '查询失败: ' + e.message
    setTimeout(() => { message.value = '' }, 4000)
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
        message.value = '已覆盖恢复成功'
        downloadCode.value = ''
        previewData.value = null
      } else {
        message.value = '恢复失败: ' + result.error
      }
    } catch (e) {
      message.value = '恢复失败: ' + e.message
    } finally {
      downloading.value = false
      setTimeout(() => { message.value = '' }, 4000)
    }
    return
  }

  const { conflicts, newQuestions } = detectMergeConflicts(previewData.value._raw)
  if (conflicts.length === 0) {
    downloading.value = true
    try {
      await applyMergeDecisions([], newQuestions, previewData.value._raw.categories)
      message.value = `合并成功，新增 ${newQuestions.length} 道题目`
      previewData.value = null
      downloadCode.value = ''
    } catch (e) {
      message.value = '合并失败: ' + e.message
    } finally {
      downloading.value = false
      setTimeout(() => { message.value = '' }, 4000)
    }
  } else {
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
    message.value = `合并完成：新增 ${cloudCount + bothCount} 道`
    previewData.value = null
    downloadCode.value = ''
    mergeConflicts.value = []
    mergeNewQuestions.value = []
  } catch (e) {
    message.value = '合并失败: ' + e.message
  } finally {
    mergeApplying.value = false
    setTimeout(() => { message.value = '' }, 5000)
  }
}

function cancelMerge() {
  mergeConflicts.value = []
  mergeNewQuestions.value = []
  conflictDecisions.value = []
  expandedConflict.value = null
}
</script>

<template>
  <section class="bg-white rounded-lg border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
    <div v-if="message" class="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
      {{ message }}
    </div>
    <h3 class="font-medium text-gray-800 dark:text-gray-100 mb-1">云迁移</h3>
    <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">生成临时迁移码，在另一台设备上输入即可同步数据。迁移码过期后自动失效。</p>

    <!-- 生成迁移码 -->
    <div class="mb-4">
      <label class="block text-xs text-gray-500 dark:text-gray-400 mb-2">上传当前数据并生成迁移码</label>
      <div class="flex flex-wrap gap-3">
        <button @click="handleCreateMigration(600)" :disabled="migrating" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
          {{ migrating ? '上传中...' : '生成迁移码（10分钟有效）' }}
        </button>
        <button @click="handleCreateMigration(86400)" :disabled="migrating" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
          {{ migrating ? '上传中...' : '生成迁移码（24小时有效）' }}
        </button>
      </div>
    </div>

    <!-- 迁移码结果 -->
    <div v-if="migrationResult" class="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800">
      <p class="text-sm text-green-700 dark:text-green-400 mb-2">数据已上传，迁移码将在 {{ formatExpiry(migrationResult.expiresIn) }}后失效</p>
      <div class="flex items-center gap-2 mb-3">
        <code class="flex-1 px-4 py-2.5 rounded-lg bg-white border border-green-200 text-lg font-mono font-bold tracking-widest text-center text-blue-700 dark:bg-gray-700 dark:border-green-800 dark:text-blue-400">{{ migrationResult.code }}</code>
        <button @click="handleCopyCode" class="px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap">
          {{ codeCopied ? '已复制' : '复制码' }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input :value="migrationResult.link" readonly class="flex-1 px-3 py-2 rounded-lg border border-green-200 text-xs text-gray-500 bg-white dark:bg-gray-700 dark:border-green-800 dark:text-gray-400" />
        <button @click="handleCopyLink" class="px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap">
          {{ linkCopied ? '已复制' : '复制链接' }}
        </button>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">在手机浏览器打开链接，可自动填充迁移码</p>
    </div>

    <!-- 分割线 -->
    <div class="border-t border-gray-100 my-4"></div>

    <!-- 从云端恢复 -->
    <div>
      <label class="block text-xs text-gray-500 dark:text-gray-400 mb-2">在新设备上恢复？输入迁移码</label>
      <div class="flex items-center gap-2 mb-3">
        <input v-model="downloadCode" type="text" placeholder="XXXX-XXXX" maxlength="32"
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono tracking-wider uppercase focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        <button @click="handlePreview" :disabled="previewLoading" class="px-3 py-2 rounded-lg text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 whitespace-nowrap">
          {{ previewLoading ? '查询中...' : '查询' }}
        </button>
      </div>

      <!-- 预览结果 -->
      <div v-if="previewData" class="p-4 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-900/30 dark:border-orange-800">
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-1">云端备份内容：</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          <span class="font-medium">{{ previewData.preview.categoryCount }}</span> 个分类，
          <span class="font-medium">{{ previewData.preview.questionCount }}</span> 道题目
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">你当前本地有 {{ questions.length }} 道题目</p>
        <div class="flex flex-wrap gap-2">
          <button @click="handleRestore('overwrite')" :disabled="downloading" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
            {{ downloading ? '恢复中...' : '覆盖本地数据' }}
          </button>
          <button @click="handleRestore('merge')" :disabled="downloading" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
            {{ downloading ? '恢复中...' : '合并到本地' }}
          </button>
          <button @click="previewData = null" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">取消</button>
        </div>
      </div>

      <!-- 合并冲突解决 -->
      <div v-if="mergeConflicts.length > 0" class="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-amber-800">发现 {{ mergeConflicts.length }} 道重复题目</p>
        </div>
        <p class="text-xs text-amber-600 mb-3">另有 {{ mergeNewQuestions.length }} 道新题目将直接导入。请逐条决定重复题目的处理方式：</p>

        <div class="flex flex-wrap gap-2 mb-4">
          <button @click="setAllDecisions('local')" class="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">全部保留本地</button>
          <button @click="setAllDecisions('cloud')" class="px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">全部用云端</button>
          <button @click="setAllDecisions('both')" class="px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200">全部保留</button>
        </div>

        <div class="space-y-3 max-h-[400px] overflow-y-auto">
          <div v-for="(item, idx) in mergeConflicts" :key="idx" class="p-3 rounded-lg bg-white border border-amber-200">
            <p class="text-sm font-medium text-gray-800 mb-2">{{ item.local.question }}</p>

            <button @click="expandedConflict = expandedConflict === idx ? null : idx" class="text-xs text-blue-600 hover:underline mb-2">
              {{ expandedConflict === idx ? '收起答案对比' : '查看两边答案对比' }}
            </button>
            <div v-if="expandedConflict === idx" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div class="p-2 rounded border border-gray-200 bg-gray-50">
                <p class="text-xs font-medium text-gray-500 mb-1">本地版本</p>
                <div class="text-xs text-gray-700 prose-content max-h-[200px] overflow-y-auto" v-html="renderMarkdown(item.local.dialog)"></div>
              </div>
              <div class="p-2 rounded border border-blue-200 bg-blue-50/50">
                <p class="text-xs font-medium text-blue-500 mb-1">云端版本</p>
                <div class="text-xs text-gray-700 prose-content max-h-[200px] overflow-y-auto" v-html="renderMarkdown(item.cloud.dialog)"></div>
              </div>
            </div>

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

        <div class="flex gap-2 mt-4">
          <button @click="applyMerge" :disabled="mergeApplying" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
            {{ mergeApplying ? '合并中...' : '确认合并' }}
          </button>
          <button @click="cancelMerge" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>
