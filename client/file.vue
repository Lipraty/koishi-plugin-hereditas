<template>
  <div class="space-y-6">
    <input type="file" ref="fileInput" @change="handleFileSelect" class="hidden" accept=".yml,.yaml">
    <transition name="fade" mode="out-in">
      <div v-if="!model" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop" @click="fileInput?.click()" :class="[
          'el-card border-4 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer',
          isDragging ? 'bg-blue-50 dark:bg-gray-800 border-blue-400 scale-105' : 'border-gray-300 dark:border-gray-600'
        ]">
        <el-icon :size="64" class="mb-4 light:text-gray-400 dark:text-gray-50 transition-transform duration-300"
          :class="{ 'scale-110 text-blue-500': isDragging }">
          <file-drop />
        </el-icon>
        <p class="text-lg text-gray-500 text-center font-medium">拖拽 koishi.yml 文件到这里，或点击以选择。</p>
      </div>
    </transition>
    <transition name="expand" mode="out-in">
      <div v-if="model" class="relative mb-6" :key="'input'">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">导入的配置内容</label>
        </div>
        <el-input v-bind="$attrs" v-model="model" type="textarea" :rows="8" placeholder="plugins: ..." class="w-full"
          readonly />
      </div>
      <div v-else class="text-center text-gray-400 dark:text-gray-500 py-8" :key="'hint'">
        <p class="text-sm">{{ kbdBySystem }} + V 粘贴配置或使用上面的方式上传文件</p>
      </div>
    </transition>

    <div class="flex justify-end gap-4">
      <el-button size="large" round @click="clearResults" :disabled="!model">清除结果</el-button>
      <el-button type="primary" size="large" round @click="$emit('hereditasNext', 2)" :disabled="!model">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import fileDrop from './icons/fileDrop.vue'

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>(null)
const kbdBySystem = ref(navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl')

const emits = defineEmits(['hereditasNext'])
const model = defineModel<string>()

const processKoishiFile = (file: File) => {
  if (!file.name.endsWith('.yml') && !file.name.endsWith('.yaml')) {
    ElMessage.error('请确保文件格式为 .yml 或 .yaml')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    model.value = e.target.result as string
    ElMessage.success('文件已成功加载！')
  }
  reader.onerror = () => {
    ElMessage.error('读取文件时发生错误。')
  }
  reader.readAsText(file)
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  processKoishiFile(file)
  target.value = ''
}

const handlePaste = (event: ClipboardEvent) => {
  const pastedContent = event.clipboardData?.getData('text')
  if (!pastedContent) return

  model.value = pastedContent
  ElMessage.success('配置已成功粘贴！')
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  const file = files.find(f => f.name.endsWith('.yml') || f.name.endsWith('.yaml'))
  if (!file) {
    ElMessage.error('未在拖拽的文件中找到 .yml 或 .yaml 文件')
    return
  }
  processKoishiFile(file)
}

const clearResults = () => {
  model.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleGlobalPaste = (event: ClipboardEvent) => {
  const content = event.clipboardData?.getData('text')
  if (content && (content.includes('plugins:') || content.includes('plugin:'))) {
    event.preventDefault()
    model.value = content
    ElMessage.success('配置已成功粘贴！')
  }
}

onMounted(() => {
  document.addEventListener('paste', handleGlobalPaste)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', handleGlobalPaste)
})
</script>

<style scoped>
kbd {
  font-family: "SF Pro Text", "Segoe UI Symbol", "Noto Sans Symbols", sans-serif;
  padding: 0.3rem 0.6rem;
  margin: 0 6px;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from {
  opacity: 0;
  transform: scaleY(0.8);
}

.expand-leave-to {
  opacity: 0;
  transform: scaleY(0.8);
}

.expand-enter-from .el-input,
.expand-leave-to .el-input {
  transform-origin: top;
}
</style>
