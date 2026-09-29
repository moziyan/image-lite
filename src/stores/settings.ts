import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { supportedOutputFormats } from '@/services/image/capabilities'
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

  /**
   * Metadata policy (AGENT_PROMPTS §6.2): metadata is stripped by default.
   * Preservation is only attempted when the user opts in — and canvas
   * re-encoding strips metadata anyway, so this is a best-effort request,
   * never a guarantee. The UI must reflect that.
   */
  const preserveMetadata = ref(false)

  /**
   * Formats this browser can actually encode, detected by probing.
   * Null until detection has run; the UI treats null as "all MVP formats".
   */
  const availableFormats = ref<OutputFormat[] | null>(null)

  const isFormatAvailable = computed(
    () => (format: OutputFormat) => availableFormats.value?.includes(format) ?? true,
  )

  /** Run once at app start; safe to call again. */
  async function detectCapabilities(): Promise<void> {
    availableFormats.value = await supportedOutputFormats()
    // Graceful fallback: if the active format cannot be encoded, move to
    // the best available one (webp > jpeg > png preference order).
    if (!availableFormats.value.includes(output.format)) {
      const fallback: OutputFormat[] = ['webp', 'jpeg', 'png']
      output.format =
        fallback.find((candidate) => availableFormats.value!.includes(candidate)) ?? 'png'
    }
  }

  /** PNG is lossless: the quality control must not apply (PRODUCT.md §10). */
  const qualityApplicable = computed(() => output.format !== 'png')

  function setFormat(format: OutputFormat): void {
    output.format = format
  }

  function setQuality(quality: number): void {
    output.quality = Math.min(100, Math.max(0, Math.round(quality)))
  }

  function setPreserveMetadata(value: boolean): void {
    preserveMetadata.value = value
  }

  function reset(): void {
    resize.width = undefined
    resize.height = undefined
    resize.maintainAspectRatio = true
    resize.allowUpscale = false
    output.format = 'webp'
    output.quality = DEFAULT_QUALITY
    preserveMetadata.value = false
  }

  return {
    resize,
    output,
    preserveMetadata,
    availableFormats,
    isFormatAvailable,
    detectCapabilities,
    qualityApplicable,
    setFormat,
    setQuality,
    setPreserveMetadata,
    reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
