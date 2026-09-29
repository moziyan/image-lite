<script setup lang="ts">
import { NButton, NStatistic } from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { downloadBlob, buildOutputFileName } from '@/services/download/downloadService'
import type { ImageItem } from '@/stores/imageQueue'
import { formatBytes } from '@/utils/bytes'

const { t } = useI18n()

const props = defineProps<{
  item: ImageItem
}>()

const result = computed(() => props.item.result)

/** Human-readable processing duration (PRODUCT.md §12). */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

const savedPercent = computed(() => {
  if (!result.value || result.value.originalSize === 0) return 0
  return Math.round((1 - result.value.compressionRatio) * 100)
})

const increased = computed(() => result.value !== null && result.value.compressionRatio > 1)

const summaryText = computed(() => {
  if (!result.value) return ''
  if (increased.value) {
    return t('result.increased', { percent: Math.abs(savedPercent.value) })
  }
  return t('result.saved', { percent: savedPercent.value })
})

function download(): void {
  if (!result.value) return
  const fileName = buildOutputFileName(props.item.name, result.value.format)
  downloadBlob(result.value.blob, fileName)
}
</script>

<template>
  <section v-if="result" class="summary" :aria-label="t('result.title')">
    <div class="stats">
      <NStatistic
        :label="t('result.original')"
        :value="`${formatBytes(result.originalSize)} · ${result.originalWidth}×${result.originalHeight}`"
      />
      <NStatistic
        :label="t('result.output')"
        :value="`${formatBytes(result.size)} · ${result.width}×${result.height}`"
      />
      <NStatistic :label="t('result.duration')" :value="formatDuration(result.processingTime)" />
    </div>
    <p class="verdict" :class="{ increased }">{{ summaryText }}</p>
    <p
      v-if="result.targetSize"
      class="target-note"
      :class="{ unmet: !result.targetSize.metTarget }"
    >
      <template v-if="result.targetSize.metTarget">
        {{ t('result.targetMet', { attempts: result.targetSize.attempts }) }}
      </template>
      <template v-else> {{ result.targetSize.note ?? t('result.targetUnmetFallback') }} </template>
    </p>
    <NButton size="small" secondary type="primary" @click="download">
      {{ t('result.download') }}
    </NButton>
  </section>
  <p v-else-if="item.status === 'error'" class="error-text" role="alert">
    {{ item.error ?? t('result.processFailed') }}
  </p>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.verdict {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.verdict.increased {
  color: var(--danger);
}

.target-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.target-note.unmet {
  color: var(--warning);
}

.error-text {
  margin: 0;
  font-size: 13px;
  color: var(--danger);
}
</style>
