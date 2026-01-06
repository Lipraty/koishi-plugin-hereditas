export interface KoishiSchema {
  plugins: Record<string, any>
  [key: string]: any
}

export interface FieldDiff {
  field: string
  currentValue: any
  importedValue: any
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  decision?: 'keep' | 'use-imported'
}

export interface PluginInstance {
  id: string
  name: string
  instanceId: string
  originalGroup?: string
  importedGroup?: string
  groupPath?: string[]
  enabled: boolean
  importedEnabled?: boolean
  current?: Record<string, any>
  imported?: Record<string, any>
  status: DiffStatus
  decision: Decision
  fieldDiffs?: FieldDiff[]
}

export interface FlatList extends PluginInstance {
  selected?: boolean
  expanded?: boolean
  advancedMode?: boolean
  finalEnabled?: boolean
}

export type DiffStatus = 'added' | 'modified' | 'deleted' | 'conflict' | 'unchanged'
export type Decision = 'keep' | 'replace' | 'merge' | 'smart' | 'add' | 'skip' | 'remove' | null
