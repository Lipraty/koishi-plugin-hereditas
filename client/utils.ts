import { FlatList, PluginInstance, DiffStatus, FieldDiff } from './schema.type'

const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  for (const key of keys) {
    if (!isEqual(a[key], b[key])) return false
  }
  return true
}

const cloneDeep = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(cloneDeep)
  const copy: any = {}
  for (const [k, v] of Object.entries(obj)) {
    copy[k] = cloneDeep(v)
  }
  return copy
}

const merge = (target: any, source: any): any => {
  const result = cloneDeep(target)
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && typeof result[key] === 'object' && result[key] !== null) {
      result[key] = merge(result[key], source[key])
    } else {
      result[key] = cloneDeep(source[key])
    }
  }
  return result
}

export const parsePluginKey = (key: string): { name: string; instanceId: string; enabled: boolean } => {
  const enabled = !key.startsWith('~')
  const cleanKey = enabled ? key : key.slice(1)
  const parts = cleanKey.split(':')

  if (parts.length > 1 && parts[parts.length - 1] !== 'group') {
    const instanceId = parts[parts.length - 1]
    const name = parts.slice(0, -1).join(':')
    return { name, instanceId, enabled }
  }
  return { name: cleanKey, instanceId: 'default', enabled }
}

export const buildPluginKey = (name: string, instanceId: string, enabled: boolean): string => {
  const key = instanceId === 'default' ? name : `${name}:${instanceId}`
  return enabled ? key : `~${key}`
}

export const flattenConfig = (config: Record<string, any>, groupPath: string[] = []): PluginInstance[] => {
  const instances: PluginInstance[] = []

  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('$')) continue

    if (key.startsWith('group:')) {
      const rawName = key.slice('group:'.length)
      const labelName = typeof value === 'object' && value && typeof (value as any).$label === 'string' ? (value as any).$label as string : rawName
      const groupName = labelName || rawName
      const subInstances = flattenConfig(value, [...groupPath, groupName])
      instances.push(...subInstances)
    } else {
      const { name, instanceId, enabled } = parsePluginKey(key)
      const displayGroup = groupPath.length ? groupPath.join('/') : undefined
      instances.push({
        id: instanceId === 'default' ? name : `${name}:${instanceId}`,
        name,
        instanceId,
        originalGroup: displayGroup,
        groupPath: groupPath.length ? [...groupPath] : undefined,
        enabled,
        current: value,
        status: 'unchanged',
        decision: null,
      })
    }
  }

  return instances
}

export const diffConfigs = (
  currentConfig: Record<string, any>,
  importedConfig: Record<string, any>,
): FlatList[] => {
  const current = flattenConfig(currentConfig)
  const imported = flattenConfig(importedConfig)

  const currentMap = mapByName(current)
  const importedMap = mapByName(imported)
  const allNames = new Set([...currentMap.keys(), ...importedMap.keys()])

  const result: FlatList[] = Array.from(allNames).map(name => {
    const curr = currentMap.get(name)
    const imp = importedMap.get(name)

    if (!curr && imp) {
      return {
        ...imp,
        importedGroup: imp.originalGroup,
        imported: imp.current,
        current: undefined,
        status: 'added',
        decision: null,
        fieldDiffs: buildFieldDiffs(undefined, imp.current),
      }
    }

    if (curr && !imp) {
      return {
        ...curr,
        imported: undefined,
        status: 'deleted',
        decision: null,
        fieldDiffs: buildFieldDiffs(curr.current, undefined),
      }
    }

    const finalGroup = curr!.groupPath?.length ? curr!.groupPath : imp!.groupPath
    const displayGroup = finalGroup && finalGroup.length ? finalGroup.join('/') : undefined
    const fieldDiffs = buildFieldDiffs(curr!.current, imp!.current)
    const status = determineStatus(fieldDiffs)

    return {
      ...curr!,
      originalGroup: displayGroup,
      importedGroup: imp!.groupPath?.length ? imp!.groupPath.join('/') : undefined,
      groupPath: finalGroup,
      imported: imp!.current,
      status,
      decision: null,
      fieldDiffs,
      instanceId: curr!.instanceId || imp!.instanceId,
    }
  })

  return result
}

const mapByName = (items: PluginInstance[]): Map<string, PluginInstance> => {
  const map = new Map<string, PluginInstance>()
  for (const item of items) {
    if (!map.has(item.name)) {
      map.set(item.name, item)
    }
  }
  return map
}

const buildFieldDiffs = (current: any, imported: any): FieldDiff[] => {
  if (!current && !imported) return []

  const allFields = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(imported || {})
  ])

  const diffs: FieldDiff[] = []

  for (const field of allFields) {
    const currentValue = current?.[field]
    const importedValue = imported?.[field]

    let status: 'added' | 'removed' | 'modified' | 'unchanged'
    if (currentValue === undefined) {
      status = 'added'
    } else if (importedValue === undefined) {
      status = 'removed'
    } else if (isEqual(currentValue, importedValue)) {
      status = 'unchanged'
    } else {
      status = 'modified'
    }

    diffs.push({
      field,
      currentValue,
      importedValue,
      status,
      decision: undefined,
    })
  }

  return diffs
}

const determineStatus = (fieldDiffs: FieldDiff[]): DiffStatus => {
  if (fieldDiffs.every(d => d.status === 'unchanged')) {
    return 'unchanged'
  }

  const hasConflict = fieldDiffs.some(d => {
    const cv = d.currentValue
    const iv = d.importedValue
    if (cv === undefined || iv === undefined) return false
    const cvIsObj = typeof cv === 'object' && cv !== null
    const ivIsObj = typeof iv === 'object' && iv !== null
    return cvIsObj !== ivIsObj || Array.isArray(cv) !== Array.isArray(iv)
  })

  return hasConflict ? 'conflict' : 'modified'
}

export const mergeConfigs = (
  current: any,
  imported: any,
  strategy: 'shallow' | 'deep' | 'field-select' = 'deep',
  selectedFields?: string[],
): any => {
  if (strategy === 'shallow') {
    return { ...current, ...imported }
  }

  if (strategy === 'field-select' && selectedFields) {
    const result = cloneDeep(current)
    for (const field of selectedFields) {
      result[field] = cloneDeep(imported?.[field])
    }
    return result
  }

  return merge(cloneDeep(current), cloneDeep(imported))
}

export const buildMergedConfig = (
  currentConfig: Record<string, any>,
  flatList: FlatList[],
  priority: 'local' | 'import' = 'local',
): Record<string, any> => {
  const merged: Record<string, any> = {}

  for (const item of flatList) {
    const { decision, status, current, imported, name, instanceId, enabled, groupPath, fieldDiffs, advancedMode } = item

    const shouldInclude =
      (status === 'added' && decision === 'add') ||
      (status === 'deleted' && decision === 'keep') ||
      (status === 'modified' && (decision === 'keep' || decision === 'replace' || decision === 'merge' || decision === 'smart')) ||
      (status === 'conflict' && (decision === 'keep' || decision === 'replace' || decision === 'merge' || decision === 'smart')) ||
      (status === 'unchanged')

    if (!shouldInclude) continue

    let config: any
    if (decision === 'replace') {
      config = cloneDeep(imported)
    } else if (decision === 'merge' || (advancedMode && fieldDiffs)) {
      config = mergeByFields(current, imported, fieldDiffs)
    } else if (decision === 'smart') {
      config = mergeSmart(current, imported, priority)
    } else {
      config = cloneDeep(current)
    }

    setInConfig(merged, groupPath, name, instanceId, config, enabled)
  }

  return merged
}

const mergeByFields = (
  current: any,
  imported: any,
  fieldDiffs?: FieldDiff[],
): any => {
  if (!fieldDiffs || !current) return imported || current

  const result = cloneDeep(current)

  for (const diff of fieldDiffs) {
    if (diff.decision === 'use-imported') {
      result[diff.field] = cloneDeep(diff.importedValue)
    }
    // decision === 'keep' 或 undefined 则保持当前值
  }

  return result
}

const mergeSmart = (current: any, imported: any, priority: 'local' | 'import'): any => {
  if (!current) return cloneDeep(imported)
  if (!imported) return cloneDeep(current)

  // 深合并，按优先级覆盖冲突
  const result = cloneDeep(current)

  const keys = new Set([...Object.keys(current), ...Object.keys(imported)])
  for (const key of keys) {
    const cv = current[key]
    const iv = imported[key]

    if (cv === undefined) {
      result[key] = cloneDeep(iv)
      continue
    }
    if (iv === undefined) {
      result[key] = cloneDeep(cv)
      continue
    }

    const bothObj = typeof cv === 'object' && cv !== null && typeof iv === 'object' && iv !== null
    if (bothObj && !Array.isArray(cv) && !Array.isArray(iv)) {
      result[key] = mergeSmart(cv, iv, priority)
    } else {
      result[key] = priority === 'import' ? cloneDeep(iv) : cloneDeep(cv)
    }
  }

  return result
}

const setInConfig = (
  config: Record<string, any>,
  groupPath: string[] | undefined,
  name: string,
  instanceId: string,
  value: any,
  enabled: boolean,
): void => {
  let target = config

  if (groupPath && groupPath.length) {
    for (const segment of groupPath) {
      const groupKey = `group:${segment}`
      if (!target[groupKey]) {
        target[groupKey] = {}
      }
      target = target[groupKey]
    }
  }

  const key = buildPluginKey(name, instanceId, enabled)
  target[key] = value
}
