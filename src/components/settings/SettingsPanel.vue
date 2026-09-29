<script setup lang="ts">
import {
  NButton,
  NCheckbox,
  NForm,
  NFormItem,
  NInputNumber,
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

const formatOptions: { label: string; value: OutputFormat }[] = [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' },
]

const canProcess = computed(() => queue.pendingItems.length > 0 && !queue.isProcessing)

const qualityValue = computed({
  get: () => settings.output.quality ?? 80,
  set: (value: number) => settings.setQuality(value),
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
            />
          </NRadioGroup>
        </NFormItem>

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

        <NButton
          type="primary"
          block
          :disabled="!canProcess"
          :loading="queue.isProcessing"
          @click="emit('processAll')"
        >
          Compress
          {{ queue.pendingItems.length > 1 ? `${queue.pendingItems.length} images` : 'image' }}
        </NButton>
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
</style>
