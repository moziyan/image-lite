<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import UploadZone from '@/components/upload/UploadZone.vue'

const { t } = useI18n()

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()
</script>

<template>
  <div class="empty-state">
    <section class="intro">
      <h1 class="headline">{{ t('empty.headline') }}</h1>
      <p class="subhead">{{ t('empty.subhead') }}</p>
    </section>
    <UploadZone @files-selected="emit('filesSelected', $event)" />
    <ul class="assurances" role="list">
      <li>{{ t('empty.local') }}</li>
      <li>{{ t('empty.batch') }}</li>
      <li>{{ t('empty.formats') }}</li>
    </ul>
  </div>
</template>

<style scoped>
.empty-state {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.intro {
  text-align: center;
}

.headline {
  margin: 0 0 12px;
  font-size: clamp(24px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}

.subhead {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.assurances {
  list-style: none;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
