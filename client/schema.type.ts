import * as exp from "constants"

export type PluginName = `${string}:${string}`

export interface KoishiSchema {
  plugins: {
    [key: PluginName]: Record<string, any>
  }
  [key: string]: Record<string, any>
}

export interface ConfigDiff {
  key: string // table row key, e.g. group:id/plugin:id
  plugin: string
  group: string
  type: 'added' | 'removed' | 'modified' | 'invariant'
  changes: ChangeItem[]
}

export interface ChangeItem {
  type: 'added' | 'removed' | 'modified' | 'state'
  field: string // config item name
  currentValue: any | null
  newValue: any | null
  selected?: boolean
}

export interface DiffTreeNode {
  key: string
  type: 'group' | 'plugin' | 'item'
  name: string
  status: 'add' | 'remove' | 'modify' | 'invariant'
}
