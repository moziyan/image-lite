<script setup lang="ts">
import { NButton, NSpin } from 'naive-ui'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import BeforeAfter from '@/components/preview/BeforeAfter.vue'
import { usePreview } from '@/composables/usePreview'
import { useImageQueueStore } from '@/stores/imageQueue'
import { useSettingsStore } from '@/stores/settings'
import { formatBytes } from '@/utils/bytes'

const { t } = useI18n()
const queue = useImageQueueStore()
const settings = useSettingsStore()

/** Show the committed result comparison when available. */
const showCompare = ref(true)

const source = computed(() => {
  const item = queue.selectedItem
  return item ? { id: item.id, file: item.file } : null
})

const previewSettings = computed(() => ({
  resize: { ...settings.resize },
  output: { ...settings.output },
}))

const { previewUrl, previewResult, isLoading, error } = usePreview(source, previewSettings)

const selectedItem = computed(() => queue.selectedItem)

/** Committed result available → allow Before/After comparison. */
const canCompare = computed(() => selectedItem.value?.resultUrl != null)

const mode = computed<'compare' | 'preview'>(() =>
  canCompare.value && showCompare.value ? 'compare' : 'preview',
)

const savedPercent = computed(() => {
  const result = previewResult.value
  if (!result || result.originalSize === 0) return null
  return Math.round((1 - result.compressionRatio) * 100)
})
</script>

<template>
  <div class="preview-panel" :aria-label="t('preview.title')">
    <template v-if="selectedItem">
      <div class="toolbar">
        <div class="mode-switch" role="group" :aria-label="t('preview.mode')">
          <NButton
            size="tiny"
            :type="mode === 'preview' ? 'primary' : 'default'"
            :ghost="mode !== 'preview'"
            @click="showCompare = false"
          >
            {{ t('preview.live') }}
          </NButton>
          <NButton
            size="tiny"
            :type="mode === 'compare' ? 'primary' : 'default'"
            :ghost="mode !== 'compare'"
            :disabled="!canCompare"
            @click="showCompare = true"
          >
            {{ t('preview.compare') }}
          </NButton>
        </div>
        <span v-if="mode === 'preview' && previewResult" class="preview-meta">
          {{ formatBytes(previewResult.size) }}
          <template v-if="savedPercent !== null">
            · {{ savedPercent >= 0 ? `−${savedPercent}%` : `+${Math.abs(savedPercent)}%` }}
          </template>
        </span>
      </div>

      <div class="viewport">
        <NSpin :show="isLoading && mode === 'preview'">
          <BeforeAfter
            v-if="mode === 'compare' && selectedItem.resultUrl"
            :original-url="selectedItem.previewUrl"
            :result-url="selectedItem.resultUrl"
            :name="selectedItem.name"
          />
          <template v-else>
            <img
              v-if="previewUrl"
              class="live-preview"
              :src="previewUrl"
              :alt="t('preview.liveAlt', { name: selectedItem.name })"
            />
            <p v-else-if="error" class="preview-error" role="alert">{{ error }}</p>
            <img
              v-else-if="!isLoading"
              class="live-preview"
              :src="selectedItem.previewUrl"
              :alt="t('preview.originalAlt', { name: selectedItem.name })"
            />
            <div v-else class="preview-placeholder" aria-hidden="true" />
          </template>
        </NSpin>
      </div>
    </template>
    <div v-else class="empty">
      <p class="muted">{{ t('preview.selectPrompt') }}</p>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.mode-switch {
  display: flex;
  gap: 6px;
}

.preview-meta {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.viewport {
  flex: 1;
  min-height: 240px;
  position: relative;
}

.viewport :deep(.n-spin-container),
.viewport :deep(.n-spin-content) {
  height: 100%;
}

.live-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  background: var(--surface-muted);
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  min-height: 240px;
  border-radius: 8px;
  background: var(--surface-muted);
}

.preview-error {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: var(--danger);
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-muted);
  border-radius: 8px;
  min-height: 240px;
}

.muted {
  color: var(--text-faint);
  font-size: 14px;
}
</style>
