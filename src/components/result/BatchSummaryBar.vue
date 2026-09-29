<script setup lang="ts">
import { NAlert, NButton } from 'naive-ui'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { ZipError } from '@/services/zip/zipService'
import { useImageQueueStore } from '@/stores/imageQueue'
import { formatBytes } from '@/utils/bytes'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'zip-error', message: string): void
}>()

const queue = useImageQueueStore()
const downloading = ref(false)

const summary = computed(() => queue.lastBatchSummary)

const savedPercent = computed(() => {
  const s = summary.value
  if (!s || s.originalBytes === 0) return 0
  // Clamp to 99: "saved 100%" would be a rounding artifact.
  return Math.min(99, Math.round((1 - s.outputBytes / s.originalBytes) * 100))
})

const summaryText = computed(() => {
  const s = summary.value
  if (!s) return ''
  const parts: string[] = []
  parts.push(t('batch.summarySimple', { succeeded: s.succeeded }))
  if (s.failed > 0) parts.push(t('batch.summaryFailed', { failed: s.failed }))
  if (s.cancelled > 0) parts.push(t('batch.summaryCancelled', { cancelled: s.cancelled }))
  if (s.succeeded > 0 && s.originalBytes > 0) {
    const original = formatBytes(s.originalBytes)
    const output = formatBytes(s.outputBytes)
    parts.push(
      savedPercent.value >= 0
        ? t('batch.summary', {
            succeeded: s.succeeded,
            original,
            output,
            percent: savedPercent.value,
          })
        : t('batch.summaryGrew', { original, output }),
    )
  }
  return parts.join(' · ')
})

const alertType = computed(() => {
  const s = summary.value
  if (!s) return 'info'
  if (s.failed > 0) return 'warning'
  return 'success'
})

async function downloadZip(): Promise<void> {
  downloading.value = true
  try {
    await queue.downloadAllAsZip()
  } catch (error) {
    const text = error instanceof ZipError ? error.message : t('batch.zipError')
    emit('zip-error', text)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div v-if="queue.completedItems.length > 0" class="batch-bar" :aria-label="t('batch.title')">
    <NAlert v-if="summary" :type="alertType" :bordered="false" class="batch-alert">
      {{ summaryText }}
    </NAlert>
    <NButton
      secondary
      type="primary"
      :loading="downloading"
      :disabled="queue.completedItems.length === 0"
      @click="downloadZip"
    >
      {{ t('batch.downloadZip') }}
    </NButton>
  </div>
</template>

<style scoped>
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.batch-alert {
  flex: 1;
  min-width: 200px;
}
</style>
