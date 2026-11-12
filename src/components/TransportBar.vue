<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '../lib/notes'

const props = defineProps<{
  hasSong: boolean
  playing: boolean
  position: number
  duration: number
  loop: boolean
  bpm: number
}>()

const emit = defineEmits<{
  (event: 'play'): void
  (event: 'pause'): void
  (event: 'stop'): void
  (event: 'seek', time: number): void
  (event: 'toggle-loop'): void
}>()

const percent = computed(() =>
  props.duration > 0
    ? Math.min(100, Math.max(0, (props.position / props.duration) * 100))
    : 0,
)

const onSeek = (event: Event) => {
  emit('seek', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="transport">
    <button
      class="play-button"
      :class="{ playing }"
      :disabled="!hasSong"
      :aria-label="playing ? '暂停' : '播放'"
      @click="emit(playing ? 'pause' : 'play')"
    >
      <svg v-if="!playing" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 5.6c0-1.1 1.2-1.8 2.2-1.2l9 6.4c.9.6.9 1.9 0 2.5l-9 6.4c-1 .7-2.2 0-2.2-1.2V5.6Z" fill="currentColor" />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6.5" y="5" width="4" height="14" rx="1.3" fill="currentColor" />
        <rect x="13.5" y="5" width="4" height="14" rx="1.3" fill="currentColor" />
      </svg>
    </button>

    <button
      class="ghost-button"
      :disabled="!hasSong"
      aria-label="停止"
      title="停止"
      @click="emit('stop')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6.5" y="6.5" width="11" height="11" rx="2.4" fill="currentColor" />
      </svg>
    </button>

    <div class="time">
      <span class="current">{{ formatTime(position, true) }}</span>
      <span class="divider">/</span>
      <span class="total">{{ formatTime(duration) }}</span>
    </div>

    <input
      class="seek"
      type="range"
      min="0"
      :max="Math.max(duration, 0.01)"
      step="0.01"
      :value="position"
      :disabled="!hasSong"
      :style="{ '--pct': `${percent}%` }"
      aria-label="播放进度"
      @input="onSeek"
    />

    <button
      class="chip loop"
      :class="{ on: loop }"
      :disabled="!hasSong"
      title="循环播放"
      @click="emit('toggle-loop')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M17 3.5 20.5 7 17 10.5M7 20.5 3.5 17 7 13.5M20.5 7H8a4.5 4.5 0 0 0-4.5 4.5M3.5 17h12.5a4.5 4.5 0 0 0 4.5-4.5"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
      <span>循环</span>
    </button>

    <div class="chip bpm" title="MIDI 速度">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 4v16M8 4l9 3.2a2 2 0 0 1 0 3.8L8 14.2"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
      <span>{{ bpm ? Math.round(bpm) : '—' }}</span>
      <em>BPM</em>
    </div>
  </div>
</template>

<style scoped>
.transport {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 2px 4px;
}

.play-button {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(140deg, #8b5cf6 0%, #6366f1 46%, #06b6d4 100%);
  box-shadow:
    0 16px 34px -14px rgba(109, 94, 252, 0.95),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
  transition:
    transform 140ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

.play-button svg {
  width: 22px;
  height: 22px;
}

.play-button:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  filter: brightness(1.08);
}

.play-button:active:not(:disabled) {
  transform: scale(0.97);
}

.play-button.playing::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px solid rgba(139, 92, 246, 0.55);
  animation: pulse-ring 2s ease-out infinite;
}

.ghost-button {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: rgba(238, 241, 251, 0.72);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.09);
  transition:
    background 140ms ease,
    color 140ms ease,
    transform 140ms ease;
}

.ghost-button svg {
  width: 16px;
  height: 16px;
}

.ghost-button:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.09);
  transform: translateY(-1px);
}

.time {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 108px;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  font-size: 12.5px;
  letter-spacing: 0.02em;
}

.current {
  color: rgba(238, 241, 251, 0.95);
  font-weight: 600;
}

.divider {
  color: rgba(255, 255, 255, 0.22);
}

.total {
  color: var(--muted);
}

.seek {
  flex: 1 1 auto;
  min-width: 80px;
  height: 22px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

.seek::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, #8b5cf6 0%, #6366f1 var(--pct), rgba(255, 255, 255, 0.1) var(--pct));
}

.seek::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.seek::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, #8b5cf6, #6366f1);
}

.seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -4px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid rgba(139, 92, 246, 0.9);
  box-shadow:
    0 0 0 4px rgba(139, 92, 246, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.55);
  transition: transform 120ms ease;
}

.seek::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid rgba(139, 92, 246, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
}

.seek:hover::-webkit-slider-thumb {
  transform: scale(1.12);
}

.seek:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition:
    color 140ms ease,
    background 140ms ease,
    border-color 140ms ease;
}

.chip svg {
  width: 14px;
  height: 14px;
}

.chip.loop {
  cursor: pointer;
}

.chip.loop:hover:not(:disabled) {
  color: var(--text);
  background: rgba(255, 255, 255, 0.07);
}

.chip.loop.on {
  color: #c4b5fd;
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.16);
  box-shadow: 0 0 18px -6px rgba(139, 92, 246, 0.8);
}

.chip.bpm {
  cursor: default;
  padding-right: 10px;
  font-variant-numeric: tabular-nums;
}

.chip.bpm em {
  font-style: normal;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.32);
}

.play-button:disabled,
.ghost-button:disabled,
.chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  70% {
    transform: scale(1.18);
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@media (max-width: 720px) {
  .transport {
    flex-wrap: wrap;
    gap: 10px;
  }

  .time {
    min-width: 92px;
    font-size: 11.5px;
  }

  .seek {
    order: 10;
    flex-basis: 100%;
  }

  .chip.loop span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .play-button.playing::after {
    animation: none;
  }
}
</style>
