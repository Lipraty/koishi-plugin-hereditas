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
      />
    </el-steps>

    <div class="mb-6 text-center">
      <h1 class="text-3xl font-bold">{{ steps[stepIndex].title }}</h1>
      <p class="mt-2 text-gray-600">{{ steps[stepIndex].description }}</p>
    </div>

    <component
      :is="steps[stepIndex].component"
      v-model="fileContent"
      ref="currentComponent"
      @hereditasNext="handleNext"
      @hereditasData="handleData"
    />
  </template>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue'
import { FlatList } from './schema.type'
import { store } from '@koishijs/client'
import start from './start.vue'
import file from './file.vue'
import confirm from './confirm.vue'
import ready from './ready.vue'

const current = (inject('manager.settings.local') as any)?.value?.name === 'koishi-plugin-hereditas'

const stepIndex = ref(0)
const fileContent = ref('')
const currentComponent = ref<any>(null)

const state = reactive({
  currentConfig: {} as Record<string, any>,
  importedConfig: {} as Record<string, any>,
  flatList: [] as FlatList[],
  priority: 'local' as 'local' | 'import',
})

const steps = [
  {
    title: 'Hereditas',
    description: '欢迎使用 Hereditas，快速导入和应用旧配置项并保持最新。',
    component: start,
  },
  {
    title: '导入',
    description: '粘贴、拖拽或选择文件来导入 koishi.yml',
    component: file,
  },
  {
    title: '确认',
    description: '修改、跳过或覆盖现有配置项。',
    component: confirm,
  },
  {
    title: '就绪',
    description: '一切已经准备就绪，点击应用以保存更改。',
    component: ready,
  },
]

onMounted(() => {
  if (!current) return
  // @ts-ignore
  state.currentConfig = store?.config?.plugins || {}
  const usage = document.querySelector('.usage')
  if (usage) {
    usage.classList.add('hidden')
  }
})

onBeforeUnmount(() => {
  if (!current) return
  const usage = document.querySelector('.usage')
  if (usage) {
    usage.classList.remove('hidden')
  }
})

const handleNext = async (index: number) => {
  stepIndex.value = index

  if (index === 3) {
    await nextTick()
    const readyComponent = currentComponent.value
    if (readyComponent?.setData) {
      readyComponent.setData(state.flatList, state.currentConfig, state.priority)
    }
  }
}

const handleData = (data: FlatList[], priority: 'local' | 'import') => {
  state.flatList = data
  // @ts-ignore
  state.priority = priority
}
</script>
