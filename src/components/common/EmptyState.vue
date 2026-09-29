<script setup lang="ts">
import UploadZone from '@/components/upload/UploadZone.vue'

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()
</script>

<template>
  <div class="empty-state">
    <section class="intro">
      <h1 class="headline">Compress images without uploading them</h1>
      <p class="subhead">
        Resize, re-encode and convert JPEG, PNG and WebP images — entirely in your browser. Your
        images never leave your device.
      </p>
    </section>
    <UploadZone @files-selected="emit('filesSelected', $event)" />
    <ul class="assurances" role="list">
      <li>🔒 100% local processing</li>
      <li>📦 Batch compression</li>
      <li>🗜️ JPEG · PNG · WebP</li>
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
  color: #111827;
}

.subhead {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #4b5563;
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
  color: #374151;
}
</style>
