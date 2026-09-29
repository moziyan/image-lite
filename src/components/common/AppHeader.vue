<script setup lang="ts">
import { NButton, NSpace } from 'naive-ui'

import { useImageQueueStore } from '@/stores/imageQueue'

const queue = useImageQueueStore()
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="logo" aria-hidden="true">▙</span>
      <span class="name">ImageLite</span>
      <span class="tagline">Local, private image compression</span>
    </div>
    <NSpace v-if="!queue.isEmpty" :size="8">
      <NButton tertiary size="small" @click="queue.clearAll()"> Clear all </NButton>
    </NSpace>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  height: 56px;
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
  background: #fff;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.logo {
  font-size: 20px;
  color: #18a058;
  align-self: center;
}

.name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 560px) {
  .tagline {
    display: none;
  }
}
</style>
