import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Context, Schema } from 'koishi'
import { } from '@koishijs/plugin-console'
import { } from '@koishijs/plugin-market'

declare module '@koishijs/plugin-console' {
  interface Events {
    'hereditas/apply': (config: Context.Config, options?: {
      forceUpdate?: boolean
      toRemove?: string[]
    }) => Promise<boolean>
  }
}

export const name = 'hereditas'

export const filter = false

export const inject = ['console', 'installer']

export const usage = '<center><h2>启用 Hereditas 以开始恢复你的配置。</h2></center>'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function flattenPluginNames(plugins: Record<string, any>): string[] {
  const names = new Set<string>()

  const walk = (node: any) => {
    if (!node || typeof node !== 'object')
      return

    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$'))
        continue

      if (key.startsWith('group:')) {
        walk(value)
        continue
      }

      const normalized = key.startsWith('~') ? key.slice(1) : key
      const parts = normalized.split(':')
      const name = parts.length > 1 ? parts.slice(0, -1).join(':') : normalized
      names.add(name)
    }
  }

  walk(plugins)
  return [...names]
}

export async function apply(ctx: Context) {
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })

  ctx.console.addListener('hereditas/apply', async (config, options = {}) => {
    const { forceUpdate = false, toRemove = [] } = options
    const workspace = ctx.baseDir
    const currentCfgPath = resolve(workspace, 'koishi.yml')
    const backupDir = resolve(workspace, 'data/hereditas/backup')
    const currentPlugins = ctx.root.scope.config.plugins || {}
    const currentNames = new Set(flattenPluginNames(currentPlugins))
    const newNames = flattenPluginNames(config || {})
    const toInstall = forceUpdate ? newNames : newNames.filter(name => !currentNames.has(name))

    try {
      // step 1: backup current config
      await mkdir(backupDir, { recursive: true })
      await copyFile(currentCfgPath, resolve(backupDir, `koishi.yml`))
      // step 2: build unified dependency map
      const deps: Record<string, string> = {}
      const toRemoveSet = new Set(toRemove)
      const allNames = [...new Set([...toInstall, ...toRemove])]

      if (allNames.length > 0) {
        const entries = await Promise.all(allNames.map(async (name) => {
          const pkgName = name.startsWith('@')
            ? [name.replace(/^(@[^/]+)\/(.+)$/, '$1/koishi-plugin-$2')]
            : [`@koishijs/plugin-${name}`, `koishi-plugin-${name}`]
          const result = await ctx.installer.findVersion(pkgName)
          if (!result)
            return null

          if (toRemoveSet.has(name)) {
            return Object.fromEntries(Object.keys(result).map(pkg => [pkg, '']))
          }
          return result
        }))
        for (const entry of entries) {
          if (entry)
            Object.assign(deps, entry)
        }
      }
      // step 3: install/uninstall packages
      if (Object.keys(deps).length > 0) {
        const code = await ctx.installer.install(deps, true)
        console.log('Installation code:', code)
      }
      // step 4: update config
      const updatedConfig = { ...ctx.root.scope.config, plugins: config || {} }
      ctx.root.scope.update(updatedConfig)
      // step 5: reload
      ctx.loader.fullReload()
      return true
    }
    catch (error) {
      console.error(error)
      return false
    }
  }, { authority: 4 })
}
