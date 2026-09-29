<script setup lang="ts">
import {
  NButton,
  NCheckbox,
  NForm,
  NFormItem,
  NInputNumber,
  NProgress,
  NRadioButton,
  NRadioGroup,
  NSlider,
  NSpin,
} from 'naive-ui'
import { computed } from 'vue'

import { useImageQueueStore } from '@/stores/imageQueue'
import { useSettingsStore } from '@/stores/settings'
import type { OutputFormat } from '@/types/image'

const settings = useSettingsStore()
const queue = useImageQueueStore()

const emit = defineEmits<{
  processAll: []
}>()

const formatOptions = computed<{ label: string; value: OutputFormat; disabled: boolean }[]>(() => [
  { label: 'JPEG', value: 'jpeg', disabled: !settings.isFormatAvailable('jpeg') },
  { label: 'PNG', value: 'png', disabled: !settings.isFormatAvailable('png') },
  { label: 'WebP', value: 'webp', disabled: !settings.isFormatAvailable('webp') },
  { label: 'AVIF', value: 'avif', disabled: !settings.isFormatAvailable('avif') },
])

const canProcess = computed(() => queue.processableItems.length > 0 && !queue.isProcessing)

const qualityValue = computed({
  get: () => settings.output.quality ?? 80,
  set: (value: number) => settings.setQuality(value),
})

/** Target size shown in KB; stored internally in bytes. */
const targetKB = computed({
  get: () => Math.round(settings.targetSize.targetBytes / 1024),
  set: (kb: number | null) => {
    // Ignore transient nulls (field cleared mid-edit); only commit numbers.
    if (typeof kb === 'number' && Number.isFinite(kb)) {
      settings.setTargetSize({ targetBytes: kb * 1024 })
    }
  },
})

const targetSizeEnabled = computed({
  get: () => settings.targetSize.enabled,
  set: (value: boolean) => settings.setTargetSize({ enabled: value }),
})
</script>

<template>
  <section class="settings-panel" aria-label="Compression settings">
    <h2 class="panel-title">Settings</h2>
    <NSpin :show="queue.isProcessing">
      <NForm label-placement="top" size="small">
        <NFormItem label="Resize">
          <div class="resize-inputs">
            <NInputNumber
              v-model:value="settings.resize.width"
              placeholder="Width"
              :min="1"
              :max="100000"
              clearable
              aria-label="Target width in pixels"
            />
            <span class="times">×</span>
            <NInputNumber
              v-model:value="settings.resize.height"
              placeholder="Height"
              :min="1"
              :max="100000"
              clearable
              aria-label="Target height in pixels"
            />
          </div>
        </NFormItem>
        <NFormItem>
          <NCheckbox v-model:checked="settings.resize.maintainAspectRatio">
            Keep aspect ratio
          </NCheckbox>
        </NFormItem>
        <NFormItem>
          <NCheckbox v-model:checked="settings.resize.allowUpscale"> Allow upscaling </NCheckbox>
        </NFormItem>

        <NFormItem label="Output format">
          <NRadioGroup
            :value="settings.output.format"
            @update:value="settings.setFormat($event as OutputFormat)"
          >
            <NRadioButton
              v-for="option in formatOptions"
              :key="option.value"
              :value="option.value"
              :label="option.label"
              :disabled="option.disabled"
            />
          </NRadioGroup>
        </NFormItem>
        <p v-if="!settings.isFormatAvailable('avif')" class="format-note">
          AVIF encoding is not supported by this browser.
        </p>

        <NFormItem v-if="settings.qualityApplicable" :label="`Quality: ${qualityValue}`">
          <NSlider
            v-model:value="qualityValue"
            :min="1"
            :max="100"
            :step="1"
            :marks="{ 1: '1', 50: '50', 100: '100' }"
            aria-label="Compression quality"
          />
        </NFormItem>
        <p v-else class="png-note">PNG is lossless — quality does not apply.</p>

        <NFormItem>
          <NCheckbox
            :checked="settings.preserveMetadata"
            @update:checked="settings.setPreserveMetadata($event)"
          >
            Preserve metadata (EXIF)
          </NCheckbox>
        </NFormItem>
        <p v-if="settings.preserveMetadata" class="format-note">
          Best effort only: canvas re-encoding strips most metadata in current browsers.
        </p>

        <NFormItem>
          <NCheckbox
            v-model:checked="targetSizeEnabled"
            :disabled="settings.output.format === 'png'"
          >
            Target file size
          </NCheckbox>
        </NFormItem>
        <template v-if="settings.targetSizeApplicable">
          <NFormItem label="Target (KB)">
            <NInputNumber
              v-model:value="targetKB"
              :min="1"
              :max="102400"
              :step="50"
              aria-label="Target file size in kilobytes"
            />
          </NFormItem>
          <NFormItem :label="`Min quality: ${settings.targetSize.minimumQuality}`">
            <NSlider
              :value="settings.targetSize.minimumQuality"
              :min="1"
              :max="100"
              :step="1"
              aria-label="Minimum quality for target-size search"
              @update:value="settings.setTargetSize({ minimumQuality: $event })"
            />
          </NFormItem>
          <NFormItem>
            <NCheckbox
              :checked="settings.targetSize.allowResize"
              @update:checked="settings.setTargetSize({ allowResize: $event })"
            >
              Allow reducing dimensions
            </NCheckbox>
          </NFormItem>
          <p class="format-note">
            Best effort: quality is searched, then dimensions reduced if needed. Exact size is not
            guaranteed.
          </p>
        </template>
        <p v-else-if="targetSizeEnabled && settings.output.format === 'png'" class="format-note">
          PNG is lossless — target size applies to JPEG / WebP / AVIF only.
        </p>

        <NButton
          v-if="!queue.isProcessing"
          type="primary"
          block
          :disabled="!canProcess"
          @click="emit('processAll')"
        >
          Compress
          {{
            queue.processableItems.length > 1 ? `${queue.processableItems.length} images` : 'image'
          }}
        </NButton>
        <div v-else class="processing-actions">
          <NProgress
            type="line"
            :percentage="Math.round(queue.aggregateProgress * 100)"
            aria-label="Overall progress"
          />
          <NButton block @click="queue.cancelAll()"> Cancel </NButton>
        </div>
      </NForm>
    </NSpin>
  </section>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.resize-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.resize-inputs :deep(.n-input-number) {
  flex: 1;
}

.times {
  color: #9ca3af;
}

.png-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: #6b7280;
}

.format-note {
  margin: -6px 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #9ca3af;
}

.processing-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
