<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { clamp, TRACK_COLORS, type KeyDef } from '../lib/notes'
import type { NoteEvent } from '../types'

const props = defineProps<{
  notes: NoteEvent[]
  position: number
  bpm: number
  keys: KeyDef[]
  whiteCount: number
}>()

/** 屏幕上可见的提前量（秒） */
const LOOKAHEAD = 3.4

const wrap = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let observer: ResizeObserver | null = null
let width = 0
let height = 0
let dpr = 1

interface Lane {
  left: number
  width: number
  black: boolean
}

const lanes = new Map<number, Lane>()

const updateLanes = () => {
  lanes.clear()
  const unit = 1 / Math.max(1, props.whiteCount)
  for (const key of props.keys) {
    if (key.black) {
      const laneWidth = unit * 0.62
      lanes.set(key.midi, {
        left: key.boundary * unit - laneWidth / 2,
        width: laneWidth,
        black: true,
      })
    } else {
      lanes.set(key.midi, { left: key.boundary * unit, width: unit, black: false })
    }
  }
}

const roundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + w, y, x + w, y + h, radius)
  context.arcTo(x + w, y + h, x, y + h, radius)
  context.arcTo(x, y + h, x, y, radius)
  context.arcTo(x, y, x + w, y, radius)
  context.closePath()
}

const drawBackground = () => {
  if (!ctx) return
  const unit = width / Math.max(1, props.whiteCount)

  for (const key of props.keys) {
    if (!key.black) continue
    const lane = lanes.get(key.midi)
    if (!lane) continue
    ctx.fillStyle = 'rgba(2, 5, 13, 0.5)'
    ctx.fillRect(lane.left * width, 0, lane.width * width, height)
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'
  for (let index = 1; index < props.whiteCount; index++) {
    ctx.fillRect(Math.round(index * unit), 0, 1, height)
  }
}

const drawGrid = (pxPerSecond: number) => {
  if (!ctx || props.bpm <= 0) return
  const beat = 60 / props.bpm
  if (beat * pxPerSecond < 9) return

  const first = Math.floor((props.position - 0.2) / beat)
  const last = Math.ceil((props.position + LOOKAHEAD) / beat)

  for (let index = first; index <= last; index++) {
    const y = height - (index * beat - props.position) * pxPerSecond
    if (y < -1 || y > height + 1) continue
    const bar = index % 4 === 0
    ctx.fillStyle = bar ? 'rgba(196, 181, 253, 0.16)' : 'rgba(255, 255, 255, 0.045)'
    ctx.fillRect(0, Math.round(y), width, bar ? 1.4 : 1)
  }
}

const drawNotes = (pxPerSecond: number) => {
  if (!ctx) return

  for (const note of props.notes) {
    const lane = lanes.get(note.midi)
    if (!lane) continue

    const bottomRaw = height - (note.time - props.position) * pxPerSecond
    const topRaw = bottomRaw - Math.max(7, note.duration * pxPerSecond)
    if (bottomRaw < -6 || topRaw > height + 6) continue

    const top = Math.max(topRaw, -26)
    const bottom = Math.min(bottomRaw, height + 26)
    if (bottom - top < 2) continue

    const x = lane.left * width + (lane.black ? 0 : 1)
    const w = Math.max(2, lane.width * width - (lane.black ? 0 : 2))
    const color = TRACK_COLORS[note.track % TRACK_COLORS.length]
    const sounding =
      props.position >= note.time - 0.02 &&
      props.position <= note.time + note.duration
    const landing = bottomRaw >= height - 44 && bottomRaw <= height + 4

    let alpha = 0.34 + clamp(note.velocity, 0, 1) * 0.6
    if (topRaw < 48) alpha *= clamp((topRaw + 26) / 74, 0, 1)

    ctx.save()
    ctx.globalAlpha = alpha
    if (sounding || landing) {
      ctx.shadowColor = color
      ctx.shadowBlur = 20
    }

    const gradient = ctx.createLinearGradient(0, top, 0, bottom)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, sounding ? '#ffffff' : color)
    ctx.fillStyle = gradient
    roundRect(ctx, x, top, w, bottom - top, Math.min(4, w / 2))
    ctx.fill()
    ctx.restore()

    if (bottom - top > 9 && w > 4) {
      ctx.globalAlpha = Math.min(1, alpha + 0.15)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.62)'
      roundRect(ctx, x + 1.5, bottom - 4.5, w - 3, 2.6, 1.2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const age = props.position - note.time
    if (age >= 0 && age < 0.22) {
      const progress = age / 0.22
      ctx.save()
      ctx.globalAlpha = (1 - progress) * 0.5
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(
        x + w / 2,
        height - 2,
        w / 2 + progress * 24,
        2.5 + progress * 11,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.restore()
    }
  }
}

const drawHitLine = () => {
  if (!ctx) return

  const glow = ctx.createLinearGradient(0, height - 72, 0, height)
  glow.addColorStop(0, 'rgba(139, 92, 246, 0)')
  glow.addColorStop(1, 'rgba(139, 92, 246, 0.16)')
  ctx.fillStyle = glow
  ctx.fillRect(0, height - 72, width, 72)

  const line = ctx.createLinearGradient(0, 0, width, 0)
  line.addColorStop(0, 'rgba(139, 92, 246, 0.28)')
  line.addColorStop(0.5, 'rgba(196, 181, 253, 0.95)')
  line.addColorStop(1, 'rgba(34, 211, 238, 0.3)')

  ctx.save()
  ctx.shadowColor = 'rgba(167, 139, 250, 0.95)'
  ctx.shadowBlur = 16
  ctx.fillStyle = line
  ctx.fillRect(0, height - 2, width, 2)
  ctx.restore()
}

const draw = () => {
  if (!ctx || width <= 0 || height <= 0) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.globalAlpha = 1

  const pxPerSecond = height / LOOKAHEAD

  drawBackground()
  drawGrid(pxPerSecond)
  if (props.notes.length) drawNotes(pxPerSecond)
  drawHitLine()
}

const resize = () => {
  const element = wrap.value
  const surface = canvas.value
  if (!element || !surface) return

  width = element.clientWidth
  height = element.clientHeight
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (!width || !height) return

  surface.width = Math.round(width * dpr)
  surface.height = Math.round(height * dpr)
  ctx = surface.getContext('2d')
  draw()
}

watch(
  () => [props.notes, props.position, props.bpm, props.whiteCount, props.keys],
  () => {
    updateLanes()
    draw()
  },
)

onMounted(() => {
  updateLanes()
  observer = new ResizeObserver(resize)
  if (wrap.value) observer.observe(wrap.value)
  resize()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="wrap" class="fall" aria-label="音符瀑布">
    <canvas ref="canvas" class="fall-canvas"></canvas>

    <div v-if="!notes.length" class="fall-empty">
      <div class="fall-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 18V5l10-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <p class="fall-title">音符会落在这里</p>
      <p class="fall-desc">从上方曲库选一首，或拖入自己的 MIDI</p>
    </div>
  </div>
</template>

<style scoped>
.fall {
  position: relative;
  height: 292px;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
  background:
    radial-gradient(90% 80% at 20% 0%, rgba(99, 102, 241, 0.18), transparent 60%),
    radial-gradient(80% 70% at 92% 4%, rgba(34, 211, 238, 0.1), transparent 64%),
    linear-gradient(180deg, #070a15 0%, #080d1b 55%, #0a1022 100%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-bottom: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 24px 50px -40px rgba(0, 0, 0, 0.95) inset;
}

.fall::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 58px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(6, 9, 18, 0.92), rgba(6, 9, 18, 0));
}

.fall-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.fall-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 20px;
  text-align: center;
  pointer-events: none;
}

.fall-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 8px;
  border-radius: 17px;
  color: #c4b5fd;
  background: linear-gradient(160deg, rgba(139, 92, 246, 0.24), rgba(34, 211, 238, 0.1));
  border: 1px solid rgba(167, 139, 250, 0.28);
  box-shadow: 0 18px 40px -22px rgba(139, 92, 246, 0.9);
}

.fall-icon svg {
  width: 25px;
  height: 25px;
}

.fall-title {
  font-size: 14.5px;
  font-weight: 600;
  color: rgba(238, 241, 251, 0.88);
}

.fall-desc {
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 720px) {
  .fall {
    height: 208px;
  }

  .fall-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }

  .fall-icon svg {
    width: 21px;
    height: 21px;
  }

  .fall-title {
    font-size: 13px;
  }

  .fall-desc {
    font-size: 11px;
  }
}
</style>
