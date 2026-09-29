<script setup lang="ts">
import { NButton, NStatistic } from 'naive-ui'
import { computed } from 'vue'

import { downloadBlob, buildOutputFileName } from '@/services/download/downloadService'
import type { ImageItem } from '@/stores/imageQueue'
import { formatBytes } from '@/utils/bytes'

const props = defineProps<{
  item: ImageItem
}>()

const result = computed(() => props.item.result)

const savedPercent = computed(() => {
  if (!result.value || result.value.originalSize === 0) return 0
  return Math.round((1 - result.value.compressionRatio) * 100)
})

const increased = computed(() => result.value !== null && result.value.compressionRatio > 1)

const summaryText = computed(() => {
  if (!result.value) return ''
  if (increased.value) {
    return `File increased by ${Math.abs(savedPercent.value)}%`
  }
  return `Saved ${savedPercent.value}%`
})

function download(): void {
  if (!result.value) return
  const fileName = buildOutputFileName(props.item.name, result.value.format)
  downloadBlob(result.value.blob, fileName)
}
</script>

<template>
  <section v-if="result" class="summary" aria-label="Compression result">
    <div class="stats">
      <NStatistic label="Original" :value="formatBytes(result.originalSize)" />
      <NStatistic label="Output" :value="formatBytes(result.size)" />
      <NStatistic label="Dimensions" :value="`${result.width}×${result.height}`" />
    </div>
    <p class="verdict" :class="{ increased }">{{ summaryText }}</p>
    <NButton size="small" secondary type="primary" @click="download"> Download </NButton>
  </section>
  <p v-else-if="item.status === 'error'" class="error-text" role="alert">
    {{ item.error ?? 'Processing failed.' }}
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
  color: #18a058;
}

.verdict.increased {
  color: #d03050;
}

.error-text {
  margin: 0;
  font-size: 13px;
  color: #d03050;
}
</style>
