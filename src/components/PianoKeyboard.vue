<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import type { KeyDef } from '../lib/notes'

const props = defineProps<{
  whites: KeyDef[]
  blacks: KeyDef[]
  whiteCount: number
  bindings: Record<number, string>
  isActive: (name: string) => boolean
}>()

const emit = defineEmits<{
  (event: 'note-on', midi: number): void
  (event: 'note-off', midi: number): void
}>()

const pointers = new Map<number, number>()

const whiteWidth = () => 100 / Math.max(1, props.whiteCount)

const blackStyle = (key: KeyDef) => {
  const width = whiteWidth() * 0.62
  return {
    left: `${key.boundary * whiteWidth() - width / 2}%`,
    width: `${width}%`,
  }
}

const press = (key: KeyDef, event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  event.preventDefault()

  const previous = pointers.get(event.pointerId)
  if (previous === key.midi) return

  if (previous !== undefined) emit('note-off', previous)
  pointers.set(event.pointerId, key.midi)
  emit('note-on', key.midi)
}

const slide = (key: KeyDef, event: PointerEvent) => {
  if (event.pointerType !== 'mouse' || !pointers.has(event.pointerId)) return
  const previous = pointers.get(event.pointerId)
  if (previous === key.midi) return
  if (previous !== undefined) emit('note-off', previous)
  pointers.set(event.pointerId, key.midi)
  emit('note-on', key.midi)
}

const release = (event: PointerEvent) => {
  const midi = pointers.get(event.pointerId)
  if (midi === undefined) return
  pointers.delete(event.pointerId)
  emit('note-off', midi)
}

const clearPointers = () => {
  pointers.clear()
}

onMounted(() => {
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
  window.addEventListener('blur', clearPointers)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', release)
  window.removeEventListener('pointercancel', release)
  window.removeEventListener('blur', clearPointers)
  pointers.forEach((midi) => emit('note-off', midi))
  pointers.clear()
})
</script>

<template>
  <div class="piano">
    <div class="white-row">
      <div
        v-for="key in whites"
        :key="key.midi"
        class="pkey white"
        :class="{ active: isActive(key.name) }"
        role="button"
        :aria-label="`弹奏 ${key.name}`"
        @pointerdown="press(key, $event)"
        @pointerenter="slide(key, $event)"
        @contextmenu.prevent
      >
        <kbd v-if="bindings[key.midi]" class="kb-chip">{{ bindings[key.midi] }}</kbd>
        <span class="key-note">{{ key.name }}</span>
      </div>
    </div>
    <div class="black-row">
      <div
        v-for="key in blacks"
        :key="key.midi"
        class="pkey black"
        :class="{ active: isActive(key.name) }"
        :style="blackStyle(key)"
        role="button"
        :aria-label="`弹奏 ${key.name}`"
        @pointerdown="press(key, $event)"
        @pointerenter="slide(key, $event)"
        @contextmenu.prevent
      >
        <kbd v-if="bindings[key.midi]" class="kb-chip">{{ bindings[key.midi] }}</kbd>
      </div>
    </div>
  </div>
</template>

<style scoped>
.piano {
  position: relative;
  height: 214px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.white-row {
  display: flex;
  height: 100%;
  border-radius: 10px 10px 18px 18px;
  overflow: hidden;
  box-shadow:
    0 22px 40px -26px rgba(0, 0, 0, 0.95),
    0 2px 0 rgba(255, 255, 255, 0.06) inset;
}

.pkey {
  position: relative;
  cursor: pointer;
}

.pkey.white {
  flex: 1 1 0;
  min-width: 0;
  border-right: 1px solid rgba(9, 13, 24, 0.32);
  border-radius: 0 0 10px 10px;
  background:
    linear-gradient(180deg, #ffffff 0%, #f4f7fd 48%, #e2e8f4 82%, #d3dbea 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 -14px 22px -12px rgba(23, 34, 60, 0.28) inset;
  transition:
    background 90ms ease,
    transform 70ms ease,
    box-shadow 120ms ease;
}

.pkey.white:last-child {
  border-right: none;
}

.pkey.white::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 34%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), transparent);
  pointer-events: none;
}

.pkey.white:hover {
  background:
    linear-gradient(180deg, #ffffff 0%, #eef2ff 52%, #dbe4f6 84%, #cbd5ea 100%);
}

.pkey.black {
  position: absolute;
  top: 0;
  height: 62%;
  z-index: 2;
  border-radius: 0 0 9px 9px;
  background:
    linear-gradient(180deg, #4a5573 0%, #232b40 38%, #0c1120 78%, #05070e 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.22) inset,
    0 -10px 16px -6px rgba(0, 0, 0, 0.65) inset,
    0 14px 22px -10px rgba(0, 0, 0, 0.95);
  transition:
    background 90ms ease,
    transform 70ms ease,
    box-shadow 120ms ease;
}

.pkey.black::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 40%;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent);
  pointer-events: none;
}

.pkey.black:hover {
  background:
    linear-gradient(180deg, #59688c 0%, #2c3650 38%, #101728 78%, #070a13 100%);
}

.pkey.white.active {
  background:
    linear-gradient(180deg, #fbfaff 0%, #e6ddff 46%, #c4b5fd 82%, #a78bfa 100%);
  transform: translateY(3px);
  box-shadow:
    0 0 34px rgba(139, 92, 246, 0.55),
    0 1px 0 rgba(255, 255, 255, 0.95) inset,
    0 -10px 18px -10px rgba(76, 29, 149, 0.45) inset;
}

.pkey.black.active {
  background:
    linear-gradient(180deg, #a78bfa 0%, #7c3aed 42%, #4c1d95 82%, #2e1065 100%);
  transform: translateY(2px);
  box-shadow:
    0 0 30px rgba(124, 58, 237, 0.75),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
}

.kb-chip {
  position: absolute;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 21px;
  padding: 0 6px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(10, 16, 32, 0.62);
  background: rgba(10, 16, 32, 0.06);
  border: 1px solid rgba(10, 16, 32, 0.1);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85) inset;
  pointer-events: none;
  transition: opacity 140ms ease;
}

.black .kb-chip {
  bottom: 12px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: none;
}

.key-note {
  position: absolute;
  bottom: 9px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(15, 23, 42, 0.38);
  pointer-events: none;
  transition: opacity 140ms ease;
}

.pkey.white.active .kb-chip,
.pkey.white.active .key-note {
  color: rgba(49, 24, 95, 0.7);
}

.pkey.black.active .kb-chip {
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 720px) {
  .piano {
    height: 168px;
  }

  .kb-chip {
    bottom: 20px;
    min-width: 18px;
    height: 18px;
    font-size: 9px;
    border-radius: 6px;
    padding: 0 4px;
  }

  .key-note {
    display: none;
  }

  .black .kb-chip {
    display: none;
  }
}
</style>
