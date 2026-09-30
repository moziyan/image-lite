<script setup lang="ts">
import { NButton, NProgress, NTag } from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ImageItem } from '@/stores/imageQueue'
import { formatBytes } from '@/utils/bytes'

const { t } = useI18n()

const props = defineProps<{
  item: ImageItem
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
}>()

const STATUS_TYPES: Record<
  ImageItem['status'],
  'default' | 'info' | 'success' | 'error' | 'warning'
> = {
  pending: 'default',
  processing: 'info',
  completed: 'success',
  error: 'error',
  // Cancelled is a neutral, user-initiated stop — not a warning condition.
  cancelled: 'default',
}

const statusLabel = computed(() => t(`queue.status.${props.item.status}`))

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
    :aria-label="t('queue.select', { name: item.name })"
    :aria-pressed="selected"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <img
      class="thumb"
      :src="item.previewUrl"
      :alt="t('queue.previewAlt', { name: item.name })"
      loading="lazy"
    />
    <div class="meta">
      <span class="filename" :title="item.name">{{ item.name }}</span>
      <span class="details">
        {{ formatBytes(item.size) }}
        <NTag size="tiny" :type="statusType" :bordered="false">{{ statusLabel }}</NTag>
      </span>
      <NProgress
        v-if="item.status === 'processing'"
        type="line"
        :percentage="Math.round(item.progress * 100)"
        :show-indicator="false"
        :height="4"
        border-radius="2px"
        :aria-label="t('queue.progress')"
      />
    </div>
    <NButton
      class="remove-btn"
      quaternary
      circle
      size="small"
      :disabled="item.status === 'processing'"
      :aria-label="t('queue.remove', { name: item.name })"
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
  background: var(--surface-hover);
}

.image-card:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.image-card.selected {
  background: var(--surface-active);
  border-color: var(--accent);
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: var(--border);
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
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.remove-btn {
  flex-shrink: 0;
  color: var(--text-faint);
}
</style>
