import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { FileValidationError } from '@/services/image/validation'
import { validateImageFiles } from '@/services/image/validation'
import { imageWorkerClient, TaskCancelledError } from '@/services/image/workerClient'
import type { EncodeOptions, ImageProcessResult, ImageStatus, ResizeOptions } from '@/types/image'

export interface ImageItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: ImageStatus
  /** 0–1 progress while status is 'processing'. */
  progress: number
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

  /** Cancel handles for in-flight tasks, keyed by item id. */
  const activeCancels = new Map<string, () => void>()

  const selectedItem = computed<ImageItem | null>(
    () => items.value.find((item) => item.id === selectedId.value) ?? null,
  )
  const isEmpty = computed(() => items.value.length === 0)
  const count = computed(() => items.value.length)
  const completedItems = computed(() => items.value.filter((item) => item.status === 'completed'))
  const processableItems = computed(() =>
    items.value.filter((item) => item.status === 'pending' || item.status === 'error'),
  )

  /** Aggregate progress (0–1) across items in the current/last batch run. */
  const aggregateProgress = computed(() => {
    const relevant = items.value.filter(
      (item) => item.status !== 'pending' || activeCancels.has(item.id),
    )
    if (relevant.length === 0) return 0
    const total = relevant.reduce((sum, item) => {
      if (item.status === 'completed') return sum + 1
      if (item.status === 'processing') return sum + item.progress
      return sum
    }, 0)
    return total / relevant.length
  })

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
        progress: 0,
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
    cancelItem(id)
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
    cancelAll()
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

  function cancelItem(id: string): void {
    activeCancels.get(id)?.()
  }

  function cancelAll(): void {
    for (const cancel of activeCancels.values()) {
      cancel()
    }
  }

  /** Process a single image through the worker. Updates item state in place. */
  async function processItem(id: string, settings: ProcessSettings): Promise<void> {
    const item = items.value.find((candidate) => candidate.id === id)
    if (!item || item.status === 'processing') return

    item.status = 'processing'
    item.progress = 0
    item.error = null

    // Release a previous result before reprocessing.
    if (item.resultUrl) {
      URL.revokeObjectURL(item.resultUrl)
      item.resultUrl = null
      item.result = null
    }

    const handle = imageWorkerClient.process(
      {
        file: item.file,
        resize: { ...settings.resize },
        output: { ...settings.output },
        metadata: { preserveExif: false },
      },
      item.id,
      {
        onProgress: (progress) => {
          item.progress = progress
        },
      },
    )
    activeCancels.set(item.id, handle.cancel)

    try {
      const result = await handle.promise
      // Guard: the item may have been removed while processing.
      if (!items.value.some((candidate) => candidate.id === id)) return
      item.result = result
      item.resultUrl = URL.createObjectURL(result.blob)
      item.status = 'completed'
      item.progress = 1
    } catch (error) {
      if (!items.value.some((candidate) => candidate.id === id)) return
      if (error instanceof TaskCancelledError) {
        item.status = 'cancelled'
        item.error = null
      } else {
        item.status = 'error'
        item.error = error instanceof Error ? error.message : 'Processing failed.'
      }
    } finally {
      activeCancels.delete(item.id)
    }
  }

  /** Process all processable (pending/error) images sequentially. */
  async function processAll(settings: ProcessSettings): Promise<void> {
    if (isProcessing.value) return
    isProcessing.value = true
    try {
      for (const item of processableItems.value) {
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
    processableItems,
    aggregateProgress,
    addFiles,
    removeItem,
    clearAll,
    selectItem,
    cancelItem,
    cancelAll,
    processItem,
    processAll,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useImageQueueStore, import.meta.hot))
}
