import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

import { previewService, TaskCancelledError } from '@/services/image/previewService'
import type { ImageProcessResult } from '@/types/image'

export interface PreviewSource {
  /** Stable identity of the image (queue item id). */
  id: string
  file: File
}

export interface PreviewSettingsInput {
  resize: {
    width?: number
    height?: number
    maintainAspectRatio: boolean
    allowUpscale: boolean
  }
  output: {
    format: 'jpeg' | 'png' | 'webp' | 'avif'
    quality?: number
  }
}

/**
 * Live output preview state for the selected image.
 *
 * - debounced via PreviewService (stale jobs are cancelled, never accumulate)
 * - owns the preview object URL; revoked on change, regeneration, and unmount
 * - no re-encoding for display: the produced blob is used directly
 */
export function usePreview(
  source: Ref<PreviewSource | null>,
  settings: Ref<PreviewSettingsInput>,
  enabled: Ref<boolean> = computed(() => true),
) {
  const previewUrl = ref<string | null>(null)
  const previewResult = ref<ImageProcessResult | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0
  let activeCancel: (() => void) | null = null

  function releaseUrl(): void {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  }

  function clearPreview(): void {
    generation += 1
    activeCancel?.()
    activeCancel = null
    releaseUrl()
    previewResult.value = null
    error.value = null
    isLoading.value = false
  }

  function regenerate(): void {
    const currentSource = source.value
    generation += 1
    const myGeneration = generation

    activeCancel?.()
    activeCancel = null

    if (!currentSource || !enabled.value) {
      releaseUrl()
      previewResult.value = null
      error.value = null
      isLoading.value = false
      return
    }

    isLoading.value = true
    error.value = null

    const handle = previewService.schedule({
      id: `${currentSource.id}-${myGeneration}`,
      file: currentSource.file,
      settings: {
        resize: { ...settings.value.resize },
        output: { ...settings.value.output },
      },
    })
    activeCancel = handle.cancel

    handle.promise.then(
      (result) => {
        if (myGeneration !== generation) return // superseded
        releaseUrl()
        previewResult.value = result
        previewUrl.value = URL.createObjectURL(result.blob)
        isLoading.value = false
      },
      (err) => {
        if (myGeneration !== generation) return // superseded
        if (err instanceof TaskCancelledError) return // stale job cancelled
        releaseUrl()
        previewResult.value = null
        error.value = err instanceof Error ? err.message : 'Preview failed.'
        isLoading.value = false
      },
    )
  }

  watch([() => source.value?.id, () => source.value?.file, settings, enabled], regenerate, {
    deep: true,
    immediate: true,
  })

  onBeforeUnmount(() => {
    generation += 1
    activeCancel?.()
    activeCancel = null
    releaseUrl()
  })

  return {
    previewUrl,
    previewResult,
    isLoading,
    error,
    regenerate,
    clearPreview,
  }
}
