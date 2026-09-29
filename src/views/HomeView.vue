<script setup lang="ts">
import { useMessage } from 'naive-ui'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ImageQueuePanel from '@/components/image/ImageQueuePanel.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import BatchSummaryBar from '@/components/result/BatchSummaryBar.vue'
import CompressionSummary from '@/components/result/CompressionSummary.vue'
import SettingsPanel from '@/components/settings/SettingsPanel.vue'
import { useImageQueueStore } from '@/stores/imageQueue'
import { useSettingsStore } from '@/stores/settings'

const queue = useImageQueueStore()
const settings = useSettingsStore()
const message = useMessage()

function onFilesSelected(files: File[]): void {
  const rejected = queue.addFiles(files)
  if (rejected.length === 1) {
    message.error(rejected[0]!.message)
  } else if (rejected.length > 1) {
    message.error(`${rejected.length} files were rejected. Check format and size limits.`)
  }
}

async function onProcessAll(): Promise<void> {
  await queue.processAll({
    resize: { ...settings.resize },
    output: { ...settings.output },
    preserveMetadata: settings.preserveMetadata,
    targetSize: settings.targetSizeApplicable ? { ...settings.targetSize } : undefined,
  })
  const summary = queue.lastBatchSummary
  if (!summary) return
  if (summary.succeeded === 0 && summary.failed > 0) {
    message.error(`All ${summary.failed} image(s) failed to process.`)
  } else if (summary.failed > 0 || summary.cancelled > 0) {
    const parts: string[] = []
    if (summary.failed > 0) parts.push(`${summary.failed} failed`)
    if (summary.cancelled > 0) parts.push(`${summary.cancelled} cancelled`)
    message.warning(`Batch finished: ${summary.succeeded} succeeded, ${parts.join(', ')}.`)
  } else {
    message.success('Done! All images processed.')
  }
}
</script>

<template>
  <div class="home">
    <AppHeader @files-selected="onFilesSelected" />
    <EmptyState v-if="queue.isEmpty" @files-selected="onFilesSelected" />
    <div v-else class="editor">
      <aside class="queue-col">
        <ImageQueuePanel />
        <BatchSummaryBar class="batch-bar-row" @zip-error="(text: string) => message.error(text)" />
      </aside>
      <section class="preview-col" aria-label="Preview">
        <PreviewPanel />
      </section>
      <aside class="settings-col" aria-label="Settings and results">
        <SettingsPanel @process-all="onProcessAll" />
        <hr v-if="queue.selectedItem" class="divider" />
        <CompressionSummary v-if="queue.selectedItem" :item="queue.selectedItem" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.editor {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 16px;
  padding: 16px;
  min-height: 0;
}

.queue-col,
.settings-col,
.preview-col {
  min-height: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.queue-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-bar-row {
  flex-shrink: 0;
}

.settings-col {
  overflow-y: auto;
}

.preview-col {
  display: flex;
  min-height: 320px;
}

.divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 16px 0;
}

@media (max-width: 900px) {
  .editor {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  .preview-col {
    order: -1;
  }
}
</style>
