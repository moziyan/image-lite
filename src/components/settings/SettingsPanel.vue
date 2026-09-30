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
import { useI18n } from 'vue-i18n'

import { useImageQueueStore } from '@/stores/imageQueue'
import { useSettingsStore } from '@/stores/settings'
import type { OutputFormat } from '@/types/image'

const { t } = useI18n()
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

/** Plain-language description of the current quality setting. */
const qualityHint = computed(() => {
  const q = qualityValue.value
  if (q <= 30) return t('settings.qualitySmall')
  if (q <= 70) return t('settings.qualityBalanced')
  return t('settings.qualityHigh')
})
</script>

<template>
  <section class="settings-panel" :aria-label="t('settings.title')">
    <h2 class="panel-title">{{ t('settings.title') }}</h2>
    <NSpin :show="queue.isProcessing">
      <NForm label-placement="top" size="small">
        <NFormItem :label="t('settings.resize')">
          <div class="resize-inputs">
            <NInputNumber
              v-model:value="settings.resize.width"
              :placeholder="t('settings.widthPlaceholder')"
              :min="1"
              :max="100000"
              clearable
              :aria-label="t('settings.widthLabel')"
            />
            <span class="times">×</span>
            <NInputNumber
              v-model:value="settings.resize.height"
              :placeholder="t('settings.heightPlaceholder')"
              :min="1"
              :max="100000"
              clearable
              :aria-label="t('settings.heightLabel')"
            />
          </div>
        </NFormItem>
        <NFormItem>
          <NCheckbox v-model:checked="settings.resize.maintainAspectRatio">
            {{ t('settings.keepAspect') }}
          </NCheckbox>
        </NFormItem>
        <NFormItem>
          <NCheckbox v-model:checked="settings.resize.allowUpscale">
            {{ t('settings.allowUpscale') }}
          </NCheckbox>
        </NFormItem>

        <NFormItem :label="t('settings.outputFormat')">
          <NRadioGroup
            :value="settings.output.format"
            :disabled="settings.availableFormats === null"
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
        <p v-if="settings.availableFormats === null" class="format-note">
          {{ t('settings.detectingFormats') }}
        </p>
        <p v-else-if="!settings.isFormatAvailable('avif')" class="format-note">
          {{ t('settings.avifUnsupported') }}
        </p>

        <NFormItem
          v-if="settings.qualityApplicable"
          :label="t('settings.quality', { value: qualityValue })"
        >
          <NSlider
            v-model:value="qualityValue"
            :min="1"
            :max="100"
            :step="1"
            :marks="{ 1: '1', 50: '50', 100: '100' }"
            :aria-label="t('settings.qualityLabel')"
          />
          <p class="quality-hint">{{ qualityHint }}</p>
        </NFormItem>
        <p v-else class="png-note">{{ t('settings.pngLossless') }}</p>

        <NFormItem>
          <NCheckbox
            :checked="settings.preserveMetadata"
            @update:checked="settings.setPreserveMetadata($event)"
          >
            {{ t('settings.preserveMetadata') }}
          </NCheckbox>
        </NFormItem>
        <p v-if="settings.preserveMetadata" class="format-note">
          {{ t('settings.metadataNote') }}
        </p>

        <NFormItem>
          <NCheckbox
            v-model:checked="targetSizeEnabled"
            :disabled="settings.output.format === 'png'"
          >
            {{ t('settings.targetSize') }}
          </NCheckbox>
        </NFormItem>
        <template v-if="settings.targetSizeApplicable">
          <NFormItem :label="t('settings.targetKB')">
            <NInputNumber
              v-model:value="targetKB"
              :min="1"
              :max="102400"
              :step="50"
              :aria-label="t('settings.targetKBLabel')"
            />
          </NFormItem>
          <NFormItem
            :label="t('settings.minQuality', { value: settings.targetSize.minimumQuality })"
          >
            <NSlider
              :value="settings.targetSize.minimumQuality"
              :min="1"
              :max="100"
              :step="1"
              :aria-label="t('settings.minQualityLabel')"
              @update:value="settings.setTargetSize({ minimumQuality: $event })"
            />
          </NFormItem>
          <NFormItem>
            <NCheckbox
              :checked="settings.targetSize.allowResize"
              @update:checked="settings.setTargetSize({ allowResize: $event })"
            >
              {{ t('settings.allowReduceDims') }}
            </NCheckbox>
          </NFormItem>
          <p class="format-note">
            {{ t('settings.targetNote') }}
          </p>
        </template>
        <p v-else-if="targetSizeEnabled && settings.output.format === 'png'" class="format-note">
          {{ t('settings.targetPngNote') }}
        </p>

        <NButton
          v-if="!queue.isProcessing"
          type="primary"
          block
          :disabled="!canProcess"
          @click="emit('processAll')"
        >
          {{ t('settings.compress', queue.processableItems.length) }}
        </NButton>
        <div v-else class="processing-actions">
          <NProgress
            type="line"
            :percentage="Math.round(queue.aggregateProgress * 100)"
            :aria-label="t('settings.overallProgress')"
          />
          <p class="batch-position" aria-live="polite">
            {{ queue.batchCounts.settled }}/{{ queue.batchCounts.total }}
          </p>
          <NButton block @click="queue.cancelAll()">{{ t('settings.cancel') }}</NButton>
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
  color: var(--text-muted);
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
  color: var(--text-faint);
}

.png-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.quality-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-faint);
}

.format-note {
  margin: -6px 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-faint);
}

.processing-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-position {
  margin: 0;
  font-size: 12px;
  text-align: center;
  color: var(--text-muted);
}
</style>
