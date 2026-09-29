import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { toImageError } from '@/services/image/errors'
import { imageProcessor } from '@/services/image/processor'
import type { FileValidationError } from '@/services/image/validation'
import { validateImageFiles } from '@/services/image/validation'
import type { EncodeOptions, ImageProcessResult, ImageStatus, ResizeOptions } from '@/types/image'

export interface ImageItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: ImageStatus
  /** Object URL for the original file preview. Revoked on removal/clear. */
  previewUrl: string
  /** Processing result, set on success. */
  result: ImageProcessResult | null
  /** Object URL created from the result blob, for preview/download. */
  resultUrl: string | null
  /** User-facing error message, set on failure. */
  error: string | null
}

export interface ProcessSettings {
  resize: ResizeOptions
  output: EncodeOptions
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
  /** True while at least one image is being processed. */
  const isProcessing = ref(false)

  const selectedItem = computed<ImageItem | null>(
    () => items.value.find((item) => item.id === selectedId.value) ?? null,
  )
  const isEmpty = computed(() => items.value.length === 0)
  const count = computed(() => items.value.length)
  const completedItems = computed(() => items.value.filter((item) => item.status === 'completed'))
  const pendingItems = computed(() =>
    items.value.filter((item) => item.status === 'pending' || item.status === 'error'),
  )

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
        result: null,
        resultUrl: null,
        error: null,
      }
      items.value.push(item)
    }

    if (selectedId.value === null && items.value.length > 0) {
      selectedId.value = items.value[0]?.id ?? null
    }

    return rejected
  }

  function releaseItemResources(item: ImageItem): void {
    URL.revokeObjectURL(item.previewUrl)
    if (item.resultUrl) {
      URL.revokeObjectURL(item.resultUrl)
      item.resultUrl = null
    }
  }

  function removeItem(id: string): void {
    const index = items.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const [removed] = items.value.splice(index, 1)
    if (removed) {
      releaseItemResources(removed)
    }
    if (selectedId.value === id) {
      selectedId.value = items.value[Math.min(index, items.value.length - 1)]?.id ?? null
    }
  }

  function clearAll(): void {
    for (const item of items.value) {
      releaseItemResources(item)
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

  /** Process a single image. Updates item state in place. */
  async function processItem(id: string, settings: ProcessSettings): Promise<void> {
    const item = items.value.find((candidate) => candidate.id === id)
    if (!item || item.status === 'processing') return

    item.status = 'processing'
    item.error = null

    // Release a previous result before reprocessing.
    if (item.resultUrl) {
      URL.revokeObjectURL(item.resultUrl)
      item.resultUrl = null
      item.result = null
    }

    try {
      const result = await imageProcessor.process({
        file: item.file,
        resize: { ...settings.resize },
        output: { ...settings.output },
        metadata: { preserveExif: false },
      })
      item.result = result
      item.resultUrl = URL.createObjectURL(result.blob)
      item.status = 'completed'
    } catch (error) {
      const imageError = toImageError(error)
      item.error = imageError.message
      item.status = 'error'
    }
  }

  /** Process all processable (pending/error) images sequentially. */
  async function processAll(settings: ProcessSettings): Promise<void> {
    if (isProcessing.value) return
    isProcessing.value = true
    try {
      for (const item of pendingItems.value) {
        await processItem(item.id, settings)
      }
    } finally {
      isProcessing.value = false
    }
  }

  return {
    items,
    selectedId,
    lastRejected,
    isProcessing,
    selectedItem,
    isEmpty,
    count,
    completedItems,
    pendingItems,
    addFiles,
    removeItem,
    clearAll,
    selectItem,
    processItem,
    processAll,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useImageQueueStore, import.meta.hot))
}
