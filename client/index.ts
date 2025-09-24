import { Context } from '@koishijs/client'

import Main from './main.vue'

export default (ctx: Context) => {
  ctx.slot({
    type: 'plugin-details',
    component: Main,
    order: -800,
  })
}
