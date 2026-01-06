import { Context, Schema } from 'koishi'
import {} from '@koishijs/client'
import { resolve } from 'node:path'
import { } from '@koishijs/plugin-market'

declare module '@koishijs/plugin-console' {
  interface Events {
    'hereditas/apply': (config: Context.Config) => Promise<void>
  }
}

export const name = 'hereditas'

export const filter = false

export const inject = ['console', 'installer']

export const usage = '<center><h2>启用 Hereditas 以开始恢复你的配置。</h2></center>'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export async function apply(ctx: Context) {
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })

  ctx.console.addListener('hereditas/apply', async (config) => {
    ctx.logger.info('Applying configuration...')

  })
}
