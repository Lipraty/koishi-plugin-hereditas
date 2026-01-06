<template>
  <div @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="onDrop"
    @click="fileInput?.click()" :class="[
      'el-card border-4 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors duration-300 cursor-pointer',
      isDragging ? 'bg-gray-50 dark:bg-gray-800' : ''
    ]">
    <el-icon :size="64" class="mb-4 light:text-gray-400 dark:text-gray-50 transition-transform duration-300"
      :class="{ 'scale-110 text-blue-500': isDragging }">
      <file-drop />
    </el-icon>
    <p class="text-lg text-gray-500 text-center font-medium">拖拽 koishi.yml 文件到这里，或点击以选择。</p>
  </div>

  <input type="file" ref="fileInput" @change="handleFileSelect" class="hidden" accept=".yml,.yaml">

  <div class="relative text-center mt-6 ">
    <el-input v-bind="$attrs" id="pasteArea" v-model="model" type="textarea" :rows="5" placeholder="plugins:..."
      class="w-full" @paste.prevent="handlePaste"/>
  </div>
  <div class="flex mt-2 items-center">
    <kbd>{{ kbdBySystem }} + V</kbd>
    <p class="flex items-center justify-center">粘贴 <code>koishi.yml</code> 内容</p>
    <div class="flex-1"></div>
    <el-button-group class="flex justify-end">
      <el-button size="large" round @click="clearResults" :disabled="!model">清除结果</el-button>
      <el-button type="primary" size="large" round @click="$emit('hereditasNext', 2)"
        :disabled="!model">下一步</el-button>
    </el-button-group>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import fileDrop from './icons/fileDrop.vue'

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>(null)
const kbdBySystem = ref(navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl')

const emits = defineEmits(['hereditasNext'])
const model = defineModel<string>()

const processKoishiFile = (file: File) => {
  if (file.name !== 'koishi.yml') {
    ElMessage.error('请确保文件名为 koishi.yml')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    model.value = e.target.result as string
    ElMessage.success('koishi.yml 文件已成功加载！')
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
  const pastedContent = event.clipboardData.getData('text')
  if (!pastedContent) return

  model.value = pastedContent
  ElMessage.success('文本已成功粘贴！')
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = Array.from(event.dataTransfer.files).find(f => f.name === 'koishi.yml')
  if (!file) {
    ElMessage.error('未在拖拽的文件中找到 koishi.yml')
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
</script>

<style scoped>
kbd {
  font-family: "SF Pro Text", "Segoe UI Symbol", "Noto Sans Symbols", sans-serif;
  padding: 0.3rem 0.6rem;
  margin: 0 6px;
}
</style>
