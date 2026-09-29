<script setup lang="ts">
import { NButton } from 'naive-ui'
import { ref, useId } from 'vue'

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const inputId = useId()
const fileInput = ref<HTMLInputElement | null>(null)

const ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

function openFilePicker(): void {
  fileInput.value?.click()
}

function onInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length > 0) {
    emit('filesSelected', files)
  }
  input.value = ''
}
</script>

<template>
  <NButton tertiary size="small" @click="openFilePicker"> Add images </NButton>
  <input
    :id="inputId"
    ref="fileInput"
    type="file"
    :accept="ACCEPT"
    multiple
    class="visually-hidden"
    tabindex="-1"
    aria-hidden="true"
    @change="onInputChange"
  />
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
