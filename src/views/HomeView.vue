<script setup lang="ts">
import { useMessage } from 'naive-ui'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ImageQueuePanel from '@/components/image/ImageQueuePanel.vue'
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
  })
  const failed = queue.items.filter((item) => item.status === 'error')
  if (failed.length > 0) {
    message.warning(`${failed.length} image(s) failed to process.`)
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
      </aside>
      <section class="preview-col" aria-label="Preview">
        <div class="preview-placeholder">
          <img
            v-if="queue.selectedItem"
            class="preview-image"
            :src="queue.selectedItem.resultUrl ?? queue.selectedItem.previewUrl"
            :alt="`Preview of ${queue.selectedItem.name}`"
          />
          <p v-else class="muted">Select an image to preview it.</p>
        </div>
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
}

.settings-col {
  overflow-y: auto;
}

.preview-col {
  display: flex;
}

.preview-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
  min-height: 240px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.muted {
  color: #9ca3af;
  font-size: 14px;
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
