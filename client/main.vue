<template>
  <template v-if="current">
    <el-steps
      :active="stepIndex"
      finish-status="success"
      :space="200"
      class="mb-6"
      simple
    >
      <el-step
        v-for="(step, index) in steps"
        :key="index"
        :title="step.title"
      >
      </el-step>
    </el-steps>
      <div class="mb-6 text-center">
        <h1 class="text-3xl font-bold">{{ steps[stepIndex].name }}</h1>
        <p class="mt-2">{{ steps[stepIndex].description }}</p>
      </div>
      <component :is="steps[stepIndex].component" v-model="fileContent" @hereditasNext="(index: number) => { stepIndex = index }"/>
  </template>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, onBeforeUnmount, watch,  } from 'vue'

import start from './start.vue'
import file from './file.vue'
import confirm from './confirm.vue'
import ready from './ready.vue'

const current: boolean = (inject('manager.settings.local') as any).value.name === 'koishi-plugin-hereditas'

const stepIndex = ref(1)
const fileContent = ref('')

const steps = [
  {
    title: '开始',
    name: 'Hereditas',
    description: '欢迎使用 Hereditas, 快速导入和应用旧配置项并保持最新。',
    component: start,
  },
  {
    title: '导入',
    name: '导入旧配置',
    description: '粘贴、拖拽或选择目录来导入 koishi.yml',
    component: file,
  },
  {
    title: '确认',
    name: '确认配置',
    description: '修改、跳过或覆盖现有配置项。',
    component: confirm,
  },
  {
    title: '就绪',
    name: '一切就绪',
    description: '一切已经准备就绪，点击应用以保存更改。',
    component: ready,
  }
]

// Hide usage info when using Hereditas
onMounted(() => {
  if (!current) return
  document.querySelector('.usage')!.classList.add('hidden')
})

onBeforeUnmount(() => {
  if (!current) return
  document.querySelector('.usage')!.classList.remove('hidden')
})

</script>
