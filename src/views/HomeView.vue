<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ImageQueuePanel from '@/components/image/ImageQueuePanel.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import BatchSummaryBar from '@/components/result/BatchSummaryBar.vue'
import CompressionSummary from '@/components/result/CompressionSummary.vue'
import SettingsPanel from '@/components/settings/SettingsPanel.vue'
import { useImageQueueStore } from '@/stores/imageQueue'
import { useSettingsStore } from '@/stores/settings'
import { translateImageError } from '@/utils/errorMessages'

const { t } = useI18n()
const queue = useImageQueueStore()
const settings = useSettingsStore()
const message = useMessage()

/** True while files are dragged over the window in editor mode. */
const isDraggingFiles = ref(false)
let dragDepth = 0

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function onFilesSelected(files: File[]): void {
  const { rejected, duplicates } = queue.addFiles(files)
  if (duplicates > 0) {
    message.warning(t('messages.duplicatesSkipped', { count: duplicates }))
  }
  if (rejected.length === 1) {
    const err = rejected[0]!
    message.error(translateImageError(err.code, { name: err.fileName, ...err.params }))
  } else if (rejected.length > 1) {
    message.error(t('messages.rejectedMany', { count: rejected.length }))
  }
}

/**
 * Global drag-and-drop (editor mode): dropping images anywhere in the
 * window adds them to the queue. preventDefault on dragover/drop also
 * stops the browser from navigating to the dropped file (which would
 * discard all queue state).
 */
function onGlobalDragEnter(event: DragEvent): void {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth += 1
  if (!queue.isEmpty) isDraggingFiles.value = true
}

function onGlobalDragOver(event: DragEvent): void {
  if (!hasFiles(event)) return
  event.preventDefault()
}

function onGlobalDragLeave(event: DragEvent): void {
  if (!hasFiles(event)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDraggingFiles.value = false
}

function onGlobalDrop(event: DragEvent): void {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth = 0
  isDraggingFiles.value = false
  // In empty state the UploadZone handles drops itself; a drop outside the
  // zone is only swallowed to prevent browser navigation.
  if (queue.isEmpty) return
  const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : []
  if (files.length > 0) onFilesSelected(files)
}

/** Paste-to-upload: screenshots land straight in the queue. */
function onPaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) {
    event.preventDefault()
    onFilesSelected(files)
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
    message.error(t('messages.allFailed', { count: summary.failed }))
  } else if (summary.failed > 0 || summary.cancelled > 0) {
    const parts: string[] = []
    if (summary.failed > 0) parts.push(t('messages.failedSuffix', { count: summary.failed }))
    if (summary.cancelled > 0)
      parts.push(t('messages.cancelledSuffix', { count: summary.cancelled }))
    message.warning(
      t('messages.batchPartial', { succeeded: summary.succeeded, rest: parts.join(', ') }),
    )
  } else {
    message.success(t('messages.batchDone'))
  }
}
</script>

<template>
  <div
    class="home"
    @dragenter="onGlobalDragEnter"
    @dragover="onGlobalDragOver"
    @dragleave="onGlobalDragLeave"
    @drop="onGlobalDrop"
    @paste="onPaste"
  >
    <AppHeader @files-selected="onFilesSelected" />
    <EmptyState v-if="queue.isEmpty" @files-selected="onFilesSelected" />
    <div v-else class="editor">
      <aside class="queue-col">
        <ImageQueuePanel />
        <BatchSummaryBar class="batch-bar-row" @zip-error="(text: string) => message.error(text)" />
      </aside>
      <section class="preview-col" :aria-label="t('preview.title')">
        <PreviewPanel />
      </section>
      <aside class="settings-col" :aria-label="t('settings.title')">
        <SettingsPanel @process-all="onProcessAll" />
        <hr v-if="queue.selectedItem" class="divider" />
        <CompressionSummary v-if="queue.selectedItem" :item="queue.selectedItem" />
      </aside>
    </div>
    <div v-if="isDraggingFiles" class="drop-overlay" aria-hidden="true">
      <p class="drop-overlay-text">{{ t('upload.dropActive') }}</p>
    </div>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border: 3px dashed var(--accent);
  pointer-events: none;
}

.drop-overlay-text {
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--accent);
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
  background: var(--surface);
  border: 1px solid var(--border);
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
  border-top: 1px solid var(--border);
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

  /* Keep the queue from pushing preview/settings off-screen on mobile. */
  .queue-col {
    max-height: 45vh;
  }
}
</style>
