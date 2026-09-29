import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { FileValidationError } from '@/services/image/validation'
import { validateImageFiles } from '@/services/image/validation'
import type { ImageStatus } from '@/types/image'

export interface ImageItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: ImageStatus
  /** Object URL for the original file preview. Revoked on removal/clear. */
  previewUrl: string
}

let nextId = 0
function generateId(): string {
  nextId += 1
  return `img-${Date.now()}-${nextId}`
}

export const useImageQueueStore = defineStore('imageQueue', () => {
  const items = ref<ImageItem[]>([])
  const selectedId = ref<string | null>(null)
  /** Validation errors from the most recent add operation. */
  const lastRejected = ref<FileValidationError[]>([])

  const selectedItem = computed<ImageItem | null>(
    () => items.value.find((item) => item.id === selectedId.value) ?? null,
  )
  const isEmpty = computed(() => items.value.length === 0)
  const count = computed(() => items.value.length)

  function addFiles(files: readonly File[]): FileValidationError[] {
    const { accepted, rejected } = validateImageFiles(files)
    lastRejected.value = rejected

    for (const file of accepted) {
      const item: ImageItem = {
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        previewUrl: URL.createObjectURL(file),
      }
      items.value.push(item)
    }

    if (selectedId.value === null && items.value.length > 0) {
      selectedId.value = items.value[0]?.id ?? null
    }

    return rejected
  }

  function removeItem(id: string): void {
    const index = items.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const [removed] = items.value.splice(index, 1)
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl)
    }
    if (selectedId.value === id) {
      selectedId.value = items.value[Math.min(index, items.value.length - 1)]?.id ?? null
    }
  }

  function clearAll(): void {
    for (const item of items.value) {
      URL.revokeObjectURL(item.previewUrl)
    }
    items.value = []
    selectedId.value = null
    lastRejected.value = []
  }

  function selectItem(id: string): void {
    if (items.value.some((item) => item.id === id)) {
      selectedId.value = id
    }
  }

  return {
    items,
    selectedId,
    lastRejected,
    selectedItem,
    isEmpty,
    count,
    addFiles,
    removeItem,
    clearAll,
    selectItem,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useImageQueueStore, import.meta.hot))
}
