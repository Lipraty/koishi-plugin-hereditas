<template>
  <el-table :data="diffData">
    <el-table-column prop="name" label="分组/插件" />
    <el-table-column prop="currentVal" label="当前配置项" />
    <el-table-column prop="newVal" label="导入配置项" />
    <el-table-column prop="actions" label="保留" >
      <template #default="{ row }"></template>
    </el-table-column>
  </el-table>
  <el-button-group class="flex justify-end mt-4">
    <el-button size="large" round @click="$emit('hereditasNext', 1)">上一步</el-button>
    <el-button type="primary" size="large" round @click="$emit('hereditasNext', 2)" :disabled="!model">下一步</el-button>
  </el-button-group>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineModel, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as yaml from 'js-yaml'
import { ChangeItem, ConfigDiff, KoishiSchema } from './schema.type'
import { store, useContext } from '@koishijs/client'
import type { } from '@koishijs/console'

const ctx = useContext()

const emits = defineEmits(['hereditasNext'])
const model = defineModel<string>()
const diffData = ref<ConfigDiff[]>()
const groupedDiff = ref<Record<string, ConfigDiff[]>>({})

onMounted(() => {
  try {
    // @ts-ignore
    const current = store?.config.plugins || null
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
    diffData.value = diffConfigs(current || {}, parsed.plugins)

    const grouped: Record<string, ConfigDiff[]> = {}
    Object.values(diffData.value || {})
      .filter(item => item.type !== 'invariant')
      .forEach(diff => {
        if (!grouped[diff.group]) {
          grouped[diff.group] = []
        }
        grouped[diff.group].push(diff)
      })
    groupedDiff.value = grouped
  } catch (e) {
    emits('hereditasNext', 1)
    ElMessage.error(e.message)
  }
})

const generateDiffTable = (diff: ConfigDiff[]) => {

}

const getTagType = (type: string) => {
  switch (type) {
    case 'added': return 'success'
    case 'removed': return 'danger'
    case 'modified': return 'warning'
    default: return 'info'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'added': return '新增'
    case 'removed': return '删除'
    case 'modified': return '修改'
    default: return '不变'
  }
}

const diffConfigs = (current: Record<string, any>, old: Record<string, any>): ConfigDiff[] => {
  const result: ConfigDiff[] = []

  const compare = (oldCfg: Record<string, any>, newCfg: Record<string, any>, groupPath?: string) => {
    const allKeys = new Set([...Object.keys(oldCfg || {}), ...Object.keys(newCfg || {})])
    for (const key of allKeys) {
      if (key.startsWith('$')) continue

      const [keyName, id] = key.split(':')
      const isGroup = keyName === 'group'
      const name = isGroup ? id : keyName

      const oldVal = oldCfg[key] || {}
      const newVal = newCfg[key] || {}

      if (isGroup) {
        // next level
        compare(oldVal, newVal, name)
        continue
      }

      const uniqueKey = `${groupPath}/${name}`

      if (oldVal === undefined || Object.keys(oldVal).length === 0) {
        result.push({
          key: uniqueKey,
          plugin: name,
          group: groupPath,
          type: 'added',
          changes: Object.keys(newVal).map(field => ({
            type: 'added',
            field,
            currentValue: null,
            newValue: newVal[field],
          })),
        })
        continue
      }

      if (newVal === undefined || Object.keys(newVal).length === 0) {
        result.push({
          key: uniqueKey,
          plugin: name,
          group: groupPath,
          type: 'removed',
          changes: Object.keys(oldVal).map(field => ({
            type: 'removed',
            field,
            currentValue: oldVal[field],
            newValue: null,
          })),
        })
        continue
      }

      if (!result[uniqueKey]) {
        result[uniqueKey] = {
          key: uniqueKey,
          plugin: name,
          group: groupPath,
          type: 'modified',
          changes: [],
        }
      }

      const pluginKeys = new Set([
        ...Object.keys(oldVal || {}),
        ...Object.keys(newVal || {}),
      ])

      for (const field of pluginKeys) {
        const oldField = oldVal?.[field]
        const newField = newVal?.[field]

        let change: ChangeItem
        if (oldField === undefined) {
          change = { type: 'added', field, currentValue: null, newValue: newField };
        } else if (newField === undefined) {
          change = { type: 'removed', field, currentValue: oldField, newValue: null };
        } else if (JSON.stringify(oldField) !== JSON.stringify(newField)) {
          change = { type: 'modified', field, currentValue: oldField, newValue: newField };
        }

        if (change) {
          result[uniqueKey].changes.push(change)
        }
      }

      // If no changes detected, mark as invariant
      if (result[uniqueKey].changes.length === 0) {
        result[uniqueKey].type = 'invariant'
      }
    }
  }

  compare(current, old, 'root')
  console.log(result)
  return result
}
</script>

<style scoped>
.diff-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  flex-wrap: nowrap;
  flex-direction: column;
  gap: 16px;
}

.diff-value {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 2px 4px;
}

.diff-removed {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.1);
  text-decoration: line-through;
}

.diff-added {
  color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
}

.diff-modified {
  background-color: rgba(230, 162, 60, 0.1);
}

.diff-summary {
  font-weight: bold;
  padding: 4px 0;
}

.empty-diff {
  color: #909399;
  font-style: italic;
}

/* 树形表格样式 */
.el-table__row .cell {
  vertical-align: middle;
}

.el-table .el-table__row--level-0 {
  font-weight: bold;
}

.plugin-name {
  font-weight: bold;
}

.config-field {
  padding-left: 12px;
}
</style>
