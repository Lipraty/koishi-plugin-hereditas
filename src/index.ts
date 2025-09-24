import { Context, Schema } from 'koishi'
import {} from '@koishijs/client'
import { resolve } from 'node:path'

export const name = 'hereditas'

export const filter = false

export const inject = ['console']

export const usage = '<center><h2>启用 Hereditas 以开始恢复你的配置。</h2></center>'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
}
