<script setup lang="ts">
import { NButton, NTag } from 'naive-ui'
import { computed } from 'vue'

import type { ImageItem } from '@/stores/imageQueue'
import { formatBytes } from '@/utils/bytes'

const props = defineProps<{
  item: ImageItem
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
}>()

const STATUS_LABELS: Record<ImageItem['status'], string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Done',
  error: 'Error',
  cancelled: 'Cancelled',
}

const STATUS_TYPES: Record<
  ImageItem['status'],
  'default' | 'info' | 'success' | 'error' | 'warning'
> = {
  pending: 'default',
  processing: 'info',
  completed: 'success',
  error: 'error',
  cancelled: 'warning',
}

const statusLabel = computed(() => STATUS_LABELS[props.item.status])

const statusType = computed(() => STATUS_TYPES[props.item.status])

function onSelect(): void {
  emit('select', props.item.id)
}

function onRemove(event: Event): void {
  event.stopPropagation()
  emit('remove', props.item.id)
}
</script>

<template>
  <div
    class="image-card"
    :class="{ selected }"
    role="button"
    tabindex="0"
    :aria-label="`Select ${item.name}`"
    :aria-pressed="selected"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <img class="thumb" :src="item.previewUrl" :alt="`Preview of ${item.name}`" loading="lazy" />
    <div class="meta">
      <span class="filename" :title="item.name">{{ item.name }}</span>
      <span class="details">
        {{ formatBytes(item.size) }}
        <NTag size="tiny" :type="statusType" :bordered="false">{{ statusLabel }}</NTag>
      </span>
    </div>
    <NButton
      class="remove-btn"
      quaternary
      circle
      size="small"
      :aria-label="`Remove ${item.name}`"
      @click="onRemove"
    >
      ✕
    </NButton>
  </div>
</template>

<style scoped>
.image-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  outline: none;
}

.image-card:hover {
  background: #f1f5f9;
}

.image-card:focus-visible {
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.4);
}

.image-card.selected {
  background: #f0fdf7;
  border-color: #18a058;
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: #e5e7eb;
  flex-shrink: 0;
}

.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.filename {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.remove-btn {
  flex-shrink: 0;
  color: #9ca3af;
}
</style>
