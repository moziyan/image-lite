import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, reactive } from 'vue'

import type { EncodeOptions, OutputFormat, ResizeOptions } from '@/types/image'

export interface GlobalSettings {
  resize: ResizeOptions
  output: EncodeOptions
}

const DEFAULT_QUALITY = 80

export const useSettingsStore = defineStore('settings', () => {
  const resize = reactive<ResizeOptions>({
    width: undefined,
    height: undefined,
    maintainAspectRatio: true,
    allowUpscale: false,
  })

  const output = reactive<EncodeOptions>({
    format: 'webp',
    quality: DEFAULT_QUALITY,
  })

  /** PNG is lossless: the quality control must not apply (PRODUCT.md §10). */
  const qualityApplicable = computed(() => output.format !== 'png')

  function setFormat(format: OutputFormat): void {
    output.format = format
  }

  function setQuality(quality: number): void {
    output.quality = Math.min(100, Math.max(0, Math.round(quality)))
  }

  function reset(): void {
    resize.width = undefined
    resize.height = undefined
    resize.maintainAspectRatio = true
    resize.allowUpscale = false
    output.format = 'webp'
    output.quality = DEFAULT_QUALITY
  }

  return {
    resize,
    output,
    qualityApplicable,
    setFormat,
    setQuality,
    reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
