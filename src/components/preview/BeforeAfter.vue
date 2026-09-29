<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  originalUrl: string
  resultUrl: string
  name: string
}>()

/** Divider position in percent (0–100). */
const position = ref(50)
const container = ref<HTMLElement | null>(null)
const dragging = ref(false)

const clipStyle = computed(() => ({
  clipPath: `inset(0 0 0 ${position.value}%)`,
}))

const dividerStyle = computed(() => ({
  left: `${position.value}%`,
}))

function clamp(value: number): number {
  return Math.min(98, Math.max(2, value))
}

function positionFromClientX(clientX: number): number {
  const el = container.value
  if (!el) return position.value
  const rect = el.getBoundingClientRect()
  if (rect.width === 0) return position.value
  return clamp(((clientX - rect.left) / rect.width) * 100)
}

function onPointerDown(event: PointerEvent): void {
  dragging.value = true
  position.value = positionFromClientX(event.clientX)
  ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  position.value = positionFromClientX(event.clientX)
}

function onPointerUp(): void {
  dragging.value = false
}

/** Keyboard-accessible divider control (arrow keys, Home/End). */
function onKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? 10 : 2
  switch (event.key) {
    case 'ArrowLeft':
      position.value = clamp(position.value - step)
      break
    case 'ArrowRight':
      position.value = clamp(position.value + step)
      break
    case 'Home':
      position.value = 2
      break
    case 'End':
      position.value = 98
      break
    default:
      return
  }
  event.preventDefault()
}
</script>

<template>
  <div
    ref="container"
    class="before-after"
    :class="{ dragging }"
    role="group"
    :aria-label="`Before and after comparison of ${props.name}`"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Original (base layer, left of the divider) -->
    <img class="layer" :src="originalUrl" :alt="`Original: ${props.name}`" draggable="false" />
    <!-- Processed (clipped layer, right of the divider) -->
    <img
      class="layer clipped"
      :style="clipStyle"
      :src="resultUrl"
      :alt="`Compressed: ${props.name}`"
      draggable="false"
    />

    <div class="divider" :style="dividerStyle" aria-hidden="true">
      <span class="handle">⋮⋮</span>
    </div>

    <!-- Keyboard-accessible control for the divider -->
    <input
      class="slider-control"
      type="range"
      min="2"
      max="98"
      :value="position"
      aria-label="Comparison divider position"
      @input="position = Number(($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
    />

    <span class="badge before" aria-hidden="true">Before</span>
    <span class="badge after" aria-hidden="true">After</span>
  </div>
</template>

<style scoped>
.before-after {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #f8fafc;
  cursor: ew-resize;
  touch-action: none;
  user-select: none;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.clipped {
  background: #f8fafc;
}

.divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: #18a058;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 36px;
  margin-left: -11px;
  border-radius: 6px;
  background: #18a058;
  color: #fff;
  font-size: 12px;
  letter-spacing: -2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.dragging .handle {
  background: #0e9f5b;
}

/* The range input is visually transparent but focusable and clickable. */
.slider-control {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: ew-resize;
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

/* Keyboard focus reveals a subtle focus ring instead of a native track. */
.slider-control:focus-visible {
  opacity: 1;
  outline: none;
  box-shadow: inset 0 0 0 3px rgba(24, 160, 88, 0.55);
  border-radius: 8px;
}

.badge {
  position: absolute;
  top: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(17, 24, 39, 0.65);
  pointer-events: none;
}

.badge.before {
  left: 8px;
}

.badge.after {
  right: 8px;
}
</style>
