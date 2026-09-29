<script setup lang="ts">
import { NButton, NIcon, NSelect, NSpace } from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AddImagesButton from '@/components/upload/AddImagesButton.vue'
import { useTheme } from '@/composables/useTheme'
import { setLocale, SUPPORTED_LOCALES, type SupportedLocale } from '@/locales'
import { useImageQueueStore } from '@/stores/imageQueue'

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const queue = useImageQueueStore()
const { t, locale } = useI18n()
const { isDark, setMode, mode } = useTheme()

function toggleTheme(): void {
  setMode(isDark.value ? 'light' : 'dark')
}

const themeLabel = computed(() =>
  mode.value === 'system'
    ? t('header.themeSystem')
    : isDark.value
      ? t('header.themeLight')
      : t('header.themeDark'),
)

const localeOptions = SUPPORTED_LOCALES.map((l) => ({ label: l.label, value: l.value }))

const currentLocale = computed({
  get: () => locale.value,
  set: (value: string) => {
    void setLocale(value as SupportedLocale)
  },
})
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="logo" aria-hidden="true">▙</span>
      <span class="name">{{ t('app.name') }}</span>
      <span class="tagline">{{ t('app.tagline') }}</span>
    </div>
    <NSpace :size="8" align="center">
      <NButton
        quaternary
        circle
        size="small"
        :aria-label="themeLabel"
        :title="themeLabel"
        @click="toggleTheme"
      >
        <template #icon>
          <NIcon :aria-hidden="true">{{ isDark ? '☀' : '☾' }}</NIcon>
        </template>
      </NButton>
      <NSelect
        v-model:value="currentLocale"
        :options="localeOptions"
        size="small"
        class="locale-select"
        :aria-label="t('header.language')"
      />
      <template v-if="!queue.isEmpty">
        <AddImagesButton @files-selected="emit('filesSelected', $event)" />
        <NButton tertiary size="small" @click="queue.clearAll()">{{
          t('header.clearAll')
        }}</NButton>
      </template>
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
  border-bottom: 1px solid var(--n-border-color, var(--border));
  background: var(--surface);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.logo {
  font-size: 20px;
  color: var(--accent);
  align-self: center;
}

.name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.tagline {
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.locale-select {
  width: 110px;
}

@media (max-width: 560px) {
  .app-header {
    height: auto;
    min-height: 56px;
    flex-wrap: wrap;
    padding: 8px 12px;
  }

  .tagline {
    display: none;
  }

  .locale-select {
    width: 96px;
  }
}
</style>
