<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { onMounted } from 'vue'

import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

onMounted(() => {
  // Probe encoder capabilities once (AVIF etc.); the UI gates options on it.
  void settings.detectCapabilities()
})
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
