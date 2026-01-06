import { Context } from '@koishijs/client'
import type { Context as KoishiContext } from 'koishi'

import Main from './main.vue'

declare module '@koishijs/plugin-console' {
  interface Events {
    'hereditas/apply': (config: KoishiContext.Config, options?: {
      forceUpdate?: boolean
      toRemove?: string[]
    }) => Promise<boolean>
  }
}

export default (ctx: Context) => {
  ctx.slot({
    type: 'plugin-details',
    component: Main,
    order: -800,
  })
}
