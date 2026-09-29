<script setup lang="ts">
import { NScrollbar } from 'naive-ui'
import { useI18n } from 'vue-i18n'

import { useImageQueueStore } from '@/stores/imageQueue'

import ImageCard from './ImageCard.vue'

const { t } = useI18n()
const queue = useImageQueueStore()
</script>

<template>
  <section class="queue-panel" :aria-label="t('queue.title')">
    <h2 class="panel-title">
      {{ t('queue.title') }} <span class="count">{{ queue.count }}</span>
    </h2>
    <NScrollbar class="queue-scroll">
      <ul class="queue-list" role="list">
        <li v-for="item in queue.items" :key="item.id">
          <ImageCard
            :item="item"
            :selected="item.id === queue.selectedId"
            @select="queue.selectItem"
            @remove="queue.removeItem"
          />
        </li>
      </ul>
    </NScrollbar>
  </section>
</template>

<style scoped>
.queue-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.count {
  background: var(--border);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.queue-scroll {
  flex: 1;
  min-height: 0;
}

.queue-list {
  list-style: none;
  margin: 0;
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
