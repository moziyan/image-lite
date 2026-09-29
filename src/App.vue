<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { onMounted } from 'vue'

import { useTheme } from '@/composables/useTheme'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const { naiveTheme } = useTheme()

onMounted(() => {
  // Probe encoder capabilities once (AVIF etc.); the UI gates options on it.
  void settings.detectCapabilities()
})
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
