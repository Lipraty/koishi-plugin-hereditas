<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">变更摘要</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="el-card p-3 text-center">
          <div class="text-2xl font-bold text-green-600">{{ stats.added }}</div>
          <div class="text-sm text-gray-600">新增插件</div>
        </div>
        <div class="el-card p-3 text-center">
          <div class="text-2xl font-bold text-orange-600">{{ stats.modified }}</div>
          <div class="text-sm text-gray-600">修改/合并</div>
        </div>
        <div class="el-card p-3 text-center">
          <div class="text-2xl font-bold text-red-600">{{ stats.deleted }}</div>
          <div class="text-sm text-gray-600">删除插件</div>
        </div>
        <div class="el-card p-3 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ stats.unchanged }}</div>
          <div class="text-sm text-gray-600">保留未变动</div>
        </div>
      </div>
    </div>

    <div class="el-card p-4 space-y-3">
      <h3 class="text-lg font-semibold">变更预览</h3>
      <pre class="text-xs diff-block" v-html="diffPreview"></pre>
    </div>

    <el-alert title="确认信息" type="info" :closable="false">
      合并配置已准备就绪。点击"应用"按钮以保存更改到 Koishi 配置中。
    </el-alert>
  </div>

  <div class="flex justify-end gap-4 mt-6">
    <el-button size="large" round @click="$emit('hereditasNext', 2)">上一步</el-button>
    <el-button type="primary" size="large" round @click="applyChanges" :loading="applying">
      应用
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, defineEmits, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as yaml from 'js-yaml'
import { FlatList } from './schema.type'
import { buildMergedConfig } from './utils'
import { store } from '@koishijs/client'

const emits = defineEmits(['hereditasNext'])

const flatList = ref<FlatList[]>([])
const currentConfig = ref<Record<string, any>>({})
const mergedConfig = ref<Record<string, any>>({})
const applying = ref(false)

const stats = computed(() => {
  const modifiedDecisions = ['replace', 'smart', 'merge']
  return {
    added: flatList.value.filter(item => item.status === 'added' && item.decision === 'add').length,
    modified: flatList.value.filter(item => item.status === 'modified' && modifiedDecisions.includes(item.decision as string)).length,
    deleted: flatList.value.filter(item => item.status === 'deleted' && item.decision === 'remove').length,
    unchanged: flatList.value.filter(item => item.status === 'unchanged').length,
  }
})

const changeRows = computed(() =>
  flatList.value.filter(item => item.status !== 'unchanged').map(item => ({
    name: item.name,
    group: item.originalGroup,
    status: item.status,
    decision: item.decision,
  }))
)

const currentYaml = computed(() => {
  try {
    return yaml.dump(currentConfig.value, { lineWidth: 200 })
  } catch {
    return ''
  }
})

const mergedConfigYaml = computed(() => {
  try {
    return yaml.dump(mergedConfig.value, { lineWidth: 200 })
  } catch {
    return '无法显示配置'
  }
})

const diffPreview = computed(() => {
  const diffs = diffLines(currentYaml.value, mergedConfigYaml.value)
  if (!diffs.length) return '无变更'
  return diffs
    .map(item => {
      const prefix = item.type === 'insert' ? '+' : item.type === 'delete' ? '-' : ' '
      const color = item.type === 'insert' ? '#3fb950' : item.type === 'delete' ? '#f85149' : '#8b949e'
      return `<span style="color:${color}">${prefix} ${escapeHtml(item.line)}</span>`
    })
    .join('\n')
})

type DiffItem = { type: 'insert' | 'delete' | 'equal'; line: string }

const diffLines = (oldStr: string, newStr: string): DiffItem[] => {
  const a = oldStr.split(/\r?\n/)
  const b = newStr.split(/\r?\n/)
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result: DiffItem[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'equal', line: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'delete', line: a[i] })
      i++
    } else {
      result.push({ type: 'insert', line: b[j] })
      j++
    }
  }
  while (i < m) {
    result.push({ type: 'delete', line: a[i++] })
  }
  while (j < n) {
    result.push({ type: 'insert', line: b[j++] })
  }

  return result
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

defineExpose({
  setData(data: FlatList[], current: Record<string, any>, priority: 'local' | 'import') {
    flatList.value = data
    currentConfig.value = current
    mergedConfig.value = buildMergedConfig(current, data, priority)
  },
})

const applyChanges = async () => {
  try {
    await ElMessageBox.confirm(
      '即将应用配置更改。此操作将更新 Koishi 配置文件。确认继续？',
      '确认应用',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    applying.value = true

    // @ts-ignore
    await store.updateConfig({
      plugins: mergedConfig.value,
    })

    ElMessage.success('配置已成功应用！')
    setTimeout(() => {
      emits('hereditasNext', 0)
    }, 1000)
  } catch (e) {
    if ((e as any).response?.config) {
      ElMessage.error('应用配置失败，请重试。')
    }
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.diff-block {
  background: #0d1117;
  color: #c9d1d9;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #30363d;
  max-height: 420px;
  overflow: auto;
  line-height: 1.5;
}

.diff-block::selection {
  background: #264f78;
}
</style>
