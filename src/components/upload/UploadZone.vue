<script setup lang="ts">
import { ref, useId } from 'vue'

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const inputId = useId()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
let dragDepth = 0

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
  // Reset so selecting the same file again triggers change.
  input.value = ''
}

function onDragEnter(event: DragEvent): void {
  event.preventDefault()
  dragDepth += 1
  isDragging.value = true
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
}

function onDragLeave(event: DragEvent): void {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    isDragging.value = false
  }
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  dragDepth = 0
  isDragging.value = false
  const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : []
  if (files.length > 0) {
    emit('filesSelected', files)
  }
}
</script>

<template>
  <div
    class="upload-zone"
    :class="{ dragging: isDragging }"
    role="button"
    tabindex="0"
    aria-label="Upload images. Click to browse or drop files here."
    @click="openFilePicker"
    @keydown.enter.prevent="openFilePicker"
    @keydown.space.prevent="openFilePicker"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
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
    <div class="upload-content">
      <svg
        class="upload-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p class="upload-title">
        <template v-if="isDragging">Drop images to add them</template>
        <template v-else>Drop images here, or click to browse</template>
      </p>
      <p class="upload-hint">JPEG, PNG or WebP · up to 100 MB each · processed locally</p>
    </div>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  background: #f8fafc;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  outline: none;
}

.upload-zone:hover,
.upload-zone:focus-visible {
  border-color: #18a058;
  background: #f0fdf7;
}

.upload-zone:focus-visible {
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.25);
}

.upload-zone.dragging {
  border-color: #18a058;
  background: #dcfce7;
}

.upload-content {
  pointer-events: none;
}

.upload-icon {
  width: 44px;
  height: 44px;
  color: #18a058;
  margin-bottom: 12px;
}

.upload-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.upload-hint {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

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
