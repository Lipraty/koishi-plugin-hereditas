<template>
  <div class="space-y-6">
    <!-- 批量操作栏 -->
    <div class="p-4 flex flex-wrap gap-4 items-center">
      <div class="flex items-center gap-2">
        <el-switch
          v-model="priority"
          active-value="import"
          inactive-value="local"
          active-text="导入优先"
          inactive-text="本地优先"
          @change="applyPriority"
        />
        <el-tag size="small" :type="priority === 'import' ? 'success' : 'info'">
          {{ priority === 'import' ? '导入优先' : '本地优先' }}
        </el-tag>
      </div>

      <el-select v-model="filterStatus" placeholder="按状态筛选" clearable class="w-40">
        <el-option label="全部" value="" />
        <el-option label="新增" value="added" />
        <el-option label="修改" value="modified" />
        <el-option label="冲突" value="conflict" />
        <el-option label="删除" value="deleted" />
        <el-option label="未变动" value="unchanged" />
      </el-select>

      <el-select v-model="sortBy" placeholder="排序" class="w-40">
        <el-option label="按名称" value="name" />
        <el-option label="按分组" value="group" />
        <el-option label="按状态" value="status" />
      </el-select>

      <div class="flex-1"></div>

      <el-checkbox v-model="hideUnchanged">隐藏未变动</el-checkbox>
      <el-checkbox v-model="alwaysKeepLocal">总是保留本地</el-checkbox>
    </div>

    <!-- 差异列表 -->
    <el-table
      :data="filteredList"
      stripe
      style="width: 100%"
      :row-key="row => row.name"
      v-model:expand-row-keys="expandedKeys"
      @expand-change="onExpandChange"
    >
      <el-table-column type="selection" width="50" :selectable="row => row.status !== 'unchanged'" />

      <el-table-column label="插件" min-width="200">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <div class="font-semibold">
                <div v-if="row.originalGroup" class="text-xs text-gray-400">group:{{ row.originalGroup }}</div>
                <span v-if="row.originalGroup" style="width: 0.5rem;display: inline-block;"></span>{{ row.name }}
                <span v-if="row.instanceId !== 'default'" class="text-xs text-gray-200">{{ row.instanceId }}</span>
              </div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-select v-model="row.decision" size="small" @change="updateDecision(row)">
            <template v-if="row.status === 'added'">
              <el-option label="添加" value="add" />
              <el-option label="跳过" value="skip" />
            </template>
            <template v-else-if="row.status === 'deleted'">
              <el-option label="保留" value="keep" />
              <el-option label="删除" value="remove" />
            </template>
            <template v-else>
              <el-option label="跳过" value="keep" />
              <el-option label="覆盖" value="replace" />
              <el-option label="合并" value="smart" />
            </template>
          </el-select>
        </template>
      </el-table-column>

      <el-table-column type="expand" width="50">
        <template #default="{ row }">
          <div v-if="row.fieldDiffs && row.fieldDiffs.length > 0" class="p-4 space-y-4">
            <!-- 模式切换 -->
            <div class="flex items-center justify-between mb-4">
              <el-switch
                v-model="row.advancedMode"
                active-text="高级模式"
                @change="() => keepExpanded(row)"
              />
              <span class="text-sm text-gray-500">
                {{ row.advancedMode ? '配置单一字段' : '整体配置' }}
              </span>
            </div>

            <!-- 字段级对比 -->
            <el-table :data="row.fieldDiffs" stripe size="small" border>
              <el-table-column label="字段名" prop="field" width="150" />

              <template v-if="priority === 'local'">
                <el-table-column label="本地值" min-width="200">
                  <template #default="{ row: field }">
                    <span v-if="field.currentValue === undefined" class="text-gray-400 italic">未设置</span>
                    <code v-else class="text-xs">{{ formatValue(field.currentValue) }}</code>
                  </template>
                </el-table-column>
                <el-table-column label="导入值" min-width="200">
                  <template #default="{ row: field }">
                    <span v-if="field.importedValue === undefined" class="text-gray-400 italic">未设置</span>
                    <code v-else class="text-xs">{{ formatValue(field.importedValue) }}</code>
                  </template>
                </el-table-column>
              </template>
              <template v-else>
                <el-table-column label="导入值" min-width="200">
                  <template #default="{ row: field }">
                    <span v-if="field.importedValue === undefined" class="text-gray-400 italic">未设置</span>
                    <code v-else class="text-xs">{{ formatValue(field.importedValue) }}</code>
                  </template>
                </el-table-column>
                <el-table-column label="本地值" min-width="200">
                  <template #default="{ row: field }">
                    <span v-if="field.currentValue === undefined" class="text-gray-400 italic">未设置</span>
                    <code v-else class="text-xs">{{ formatValue(field.currentValue) }}</code>
                  </template>
                </el-table-column>
              </template>

              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row: field }">
                  <el-tag :type="getFieldStatusType(field.status)" size="small">
                    {{ getFieldStatusLabel(field.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column v-if="row.advancedMode" label="操作" width="150">
                <template #default="{ row: field }">
                  <el-select
                    v-model="field.decision"
                    size="small"
                    :disabled="field.status === 'unchanged'"
                  >
                    <el-option label="保持本地" value="keep" />
                    <el-option label="使用导入" value="use-imported" />
                  </el-select>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分组信息 -->
            <div v-if="row.originalGroup || row.importedGroup" class="text-sm bg-blue-50 p-2 rounded">
              <strong>分组:</strong>
              <span v-if="row.originalGroup">本地: {{ row.originalGroup }}</span>
              <span v-if="row.importedGroup && row.importedGroup !== row.originalGroup" class="ml-2">
                导入: {{ row.importedGroup }} → 将使用本地分组
              </span>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <div class="flex justify-end gap-4 mt-6">
    <el-button size="large" round @click="$emit('hereditasNext', 1)">上一步</el-button>
    <el-button type="primary" size="large" round @click="nextStep" :disabled="!flatList">下一步</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as yaml from 'js-yaml'
import { FlatList, KoishiSchema } from './schema.type'
import { diffConfigs } from './utils'
import { store } from '@koishijs/client'

const emits = defineEmits<{
  hereditasNext: [index: number]
  hereditasData: [data: FlatList[], priority: 'local' | 'import']
}>()
const model = defineModel<string>()

const flatList = ref<FlatList[]>([])
const filterStatus = ref('')
const sortBy = ref('name')
const hideUnchanged = ref(true)
const priority = ref<'local' | 'import'>('local')
const expandedKeys = ref<string[]>([])
const alwaysKeepLocal = ref(true)

onMounted(() => {
  try {
    // @ts-ignore
    const current = store?.config?.plugins || {}
    const parsed = yaml.load(model.value, {
      schema: yaml.FAILSAFE_SCHEMA,
      json: true,
      onWarning: (message) => {
        ElMessage.warning(message)
      },
    }) as KoishiSchema

    if (!parsed || typeof parsed !== 'object' || !parsed?.plugins) {
      throw new Error('配置文件格式有误，请重新导入')
    }

    flatList.value = diffConfigs(current, parsed.plugins)
    applyPriority()
  } catch (e) {
    emits('hereditasNext', 1)
    ElMessage.error((e as Error).message)
  }
})

const filteredList = computed(() => {
  let result = flatList.value

  if (hideUnchanged.value) {
    result = result.filter(item => item.status !== 'unchanged')
  }

  if (filterStatus.value) {
    result = result.filter(item => item.status === filterStatus.value)
  }

  if (sortBy.value === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'group') {
    result = [...result].sort((a, b) => {
      const aGroup = a.originalGroup || ''
      const bGroup = b.originalGroup || ''
      return aGroup.localeCompare(bGroup) || a.name.localeCompare(b.name)
    })
  } else if (sortBy.value === 'status') {
    const statusOrder = { added: 0, modified: 1, conflict: 2, deleted: 3, unchanged: 4 }
    result = [...result].sort((a, b) => {
      const orderDiff = (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999)
      return orderDiff !== 0 ? orderDiff : a.name.localeCompare(b.name)
    })
  }

  return result
})

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'added': return '新增'
    case 'deleted': return '本地'
    case 'modified': return '修改'
    case 'conflict': return '冲突'
    case 'unchanged': return '未变动'
    default: return '未知'
  }
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'added': return 'success'
    case 'deleted': return 'primary'
    case 'modified': return 'warning'
    case 'conflict': return 'warning'
    default: return 'info'
  }
}

const selectAll = () => {
  for (const item of filteredList.value) {
    if (item.status !== 'unchanged') {
      item.selected = true
    }
  }
}

const selectNone = () => {
  for (const item of flatList.value) {
    item.selected = false
  }
}

const updateDecision = (row: FlatList) => {
  // 当插件级别决策变化时，重置高级模式
  if (row.advancedMode && (row.decision === 'keep' || row.decision === 'replace')) {
    row.advancedMode = false
  }
}

const applyPriority = () => {
  for (const item of flatList.value) {
    if (item.status === 'unchanged') continue

    if (item.status === 'added') {
      item.decision = priority.value === 'import' ? 'add' : 'skip'
    } else if (item.status === 'deleted') {
      if (priority.value === 'import' && alwaysKeepLocal.value) {
        item.decision = 'keep'
      } else {
        item.decision = priority.value === 'import' ? 'remove' : 'keep'
      }
    } else if (item.status === 'modified' || item.status === 'conflict') {
      item.decision = priority.value === 'import' ? 'smart' : 'keep'
    }

    if (item.fieldDiffs) {
      for (const diff of item.fieldDiffs) {
        if (diff.status === 'unchanged') continue
        diff.decision = priority.value === 'import' ? 'use-imported' : 'keep'
      }
    }
  }
}

const keepExpanded = (row: FlatList) => {
  if (!expandedKeys.value.includes(row.name)) {
    expandedKeys.value.push(row.name)
  }
}

const onExpandChange = (row: FlatList, expanded: FlatList[]) => {
  expandedKeys.value = expanded.map(item => item.name)
}

const formatValue = (value: any): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

const getFieldStatusLabel = (status: string) => {
  switch (status) {
    case 'added': return '新增'
    case 'removed': return '移除'
    case 'modified': return '修改'
    case 'unchanged': return '未变'
    default: return status
  }
}

const getFieldStatusType = (status: string) => {
  switch (status) {
    case 'added': return 'success'
    case 'removed': return 'danger'
    case 'modified': return 'warning'
    default: return 'info'
  }
}

const nextStep = () => {
  emits('hereditasData', flatList.value, priority.value)
  emits('hereditasNext', 3)
}
</script>

<style scoped>
:deep(.el-select) {
  width: 100%;
}

pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
