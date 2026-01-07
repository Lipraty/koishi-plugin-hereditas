import { FlatList } from './schema.type'

export function buildConfigTree(flatList: FlatList[]): Record<string, any> {
  const tree: Record<string, any> = {}

  for (const item of flatList) {
    const { name, instanceId, enabled, originalGroup, status, decision, current, imported } = item

    let config = current
    if (decision === 'replace') {
      config = imported
    }
    else if (decision === 'merge') {
      config = current
    }

    const key = buildKey(name, instanceId, enabled)

    if (!originalGroup) {
      tree[key] = {
        ...config,
        _meta: { status, decision },
      }
    }
    else {
      const groupKey = `${originalGroup}:group:`
      if (!tree[groupKey]) {
        tree[groupKey] = {}
      }
      tree[groupKey][key] = {
        ...config,
        _meta: { status, decision },
      }
    }
  }

  return tree
}

function buildKey(name: string, instanceId: string, enabled: boolean): string {
  const key = instanceId === 'default' ? name : `${name}:${instanceId}`
  return enabled ? key : `~${key}`
}

export function getChangeClass(status: string, decision: string | null): 'added' | 'removed' | 'modified' | 'unchanged' {
  if (status === 'added' && decision === 'add')
    return 'added'
  if (status === 'deleted' && decision === 'remove')
    return 'removed'
  if (status === 'modified' && decision === 'replace')
    return 'modified'
  if (status === 'modified' && decision === 'merge')
    return 'modified'
  return 'unchanged'
}
