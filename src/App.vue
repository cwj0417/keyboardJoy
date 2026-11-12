<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FallingNotes from './components/FallingNotes.vue'
import PianoKeyboard from './components/PianoKeyboard.vue'
import TransportBar from './components/TransportBar.vue'
import { PRESETS } from './audio/presets'
import { DEMO_SONGS } from './data/demos'
import { formatTime, KEY_BINDINGS, TRACK_COLORS } from './lib/notes'
import { usePiano } from './composables/usePiano'

const {
  song,
  playing,
  position,
  loop,
  loading,
  error,
  volume,
  presetId,
  octave,
  metronomeOn,
  metronomeBpm,
  beat,
  sustainOn,
  keys,
  whites,
  blacks,
  whiteCount,
  bindings,
  baseMidi,
  rangeLabel,
  isNoteActive,
  playSong,
  pauseSong,
  stopSong,
  seekTo,
  toggleLoop,
  playDemo,
  loadMidiFile,
  noteOn,
  noteOff,
  releaseAllUser,
  toggleSustain,
  setShiftHeld,
  shiftOctave,
  setPreset,
  setVolume,
  toggleMetronome,
  setMetronomeBpm,
} = usePiano()

const fileInput = ref<HTMLInputElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
const pressed = new Map<string, number>()

let dragDepth = 0

const scrollToStage = () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  stageRef.value?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

const duration = computed(() => song.value?.duration ?? 0)
const bpm = computed(() => song.value?.bpm ?? 0)
const metaLine = computed(() => {
  const current = song.value
  if (!current) return ''
  return `${current.subtitle} · ${formatTime(current.duration)} · ${current.notes.length} 音符 · ${Math.round(current.bpm)} BPM`
})
const metronomePercent = computed(() => ((metronomeBpm.value - 50) / 150) * 100)

const pickFile = () => fileInput.value?.click()

const handleFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await loadMidiFile(file)
}

const startDemo = () => {
  void playDemo('canon')
  scrollToStage()
}

const onDemoClick = (id?: string) => {
  if (!id) return
  void playDemo(id)
  scrollToStage()
}

const togglePlay = async () => {
  if (!song.value) return
  if (playing.value) pauseSong()
  else await playSong()
}

const onVolumeInput = (event: Event) => {
  setVolume(Number((event.target as HTMLInputElement).value))
}

const onBpmInput = (event: Event) => {
  setMetronomeBpm(Number((event.target as HTMLInputElement).value))
}

const onDragEnter = (event: DragEvent) => {
  event.preventDefault()
  dragDepth++
  dragging.value = true
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}

const onDrop = async (event: DragEvent) => {
  event.preventDefault()
  dragDepth = 0
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) await loadMidiFile(file)
}

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  if (!element) return false
  if (element.isContentEditable) return true
  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true
  if (element.tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type
    return !['range', 'button', 'checkbox', 'radio', 'file', 'color', 'submit', 'reset'].includes(
      type,
    )
  }
  return false
}

const onKeyDown = (event: KeyboardEvent) => {
  if (isTypingTarget(event.target)) return

  if (event.code === 'Space') {
    event.preventDefault()
    if (!event.repeat) void togglePlay()
    return
  }

  if (event.key === 'Shift') {
    setShiftHeld(true)
    return
  }

  if (event.metaKey || event.ctrlKey || event.altKey) return

  if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    if (!song.value) return
    event.preventDefault()
    const delta = event.code === 'ArrowLeft' ? -5 : 5
    seekTo(position.value + delta)
    return
  }

  const offset = KEY_BINDINGS[event.code]
  if (offset === undefined || event.repeat) return

  event.preventDefault()
  if (pressed.has(event.code)) return

  const midi = baseMidi.value + offset
  pressed.set(event.code, midi)
  noteOn(midi)
}

const onKeyUp = (event: KeyboardEvent) => {
  if (event.key === 'Shift') {
    setShiftHeld(false)
    return
  }

  const midi = pressed.get(event.code)
  if (midi === undefined) return
  pressed.delete(event.code)
  noteOff(midi)
}

const releaseEverything = () => {
  pressed.clear()
  setShiftHeld(false)
  releaseAllUser()
}

const onWindowBlur = () => releaseEverything()

const onVisibilityChange = () => {
  if (document.hidden) releaseEverything()
}

watch(octave, () => pressed.clear())

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  releaseEverything()
})
</script>

<template>
  <div class="page">
    <div class="backdrop" aria-hidden="true">
      <span class="blob blob-a"></span>
      <span class="blob blob-b"></span>
      <span class="blob blob-c"></span>
      <span class="grid"></span>
      <span class="noise"></span>
    </div>

    <header class="nav container">
      <a class="brand" href="/" @click.prevent>
        <span class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.2" y="4.5" width="17.6" height="15" rx="3.2" stroke="currentColor" stroke-width="1.5" />
            <path d="M7.4 5v9.2M12 5v9.2M16.6 5v9.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M5 20.6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".45" />
          </svg>
        </span>
        <span class="brand-name">Keyboard<em>Joy</em></span>
      </a>

      <div class="nav-right">
        <span class="live-status"><span class="live-dot"></span>Web Audio 驱动</span>
        <span class="nav-pill">Vue 3 · Vite · Tone.js</span>
      </div>
    </header>

    <main class="container">
      <section class="hero">
        <p class="eyebrow"><span class="eyebrow-dot"></span>浏览器里的钢琴工作室</p>
        <h1>让灵感，<span class="gradient-text">随指尖流淌</span></h1>
        <p class="lede">
          用键盘、鼠标或触屏即兴演奏；拖入 MIDI，看音符从上往下落到琴键上。<br class="desktop-only" />
          四种音色，一触即响，无需安装。
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary" @click="pickFile">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 15.5V4m0 0L7.8 8.2M12 4l4.2 4.2M5 15.5v2.7A2.8 2.8 0 0 0 7.8 21h8.4a2.8 2.8 0 0 0 2.8-2.8v-2.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            载入 MIDI
          </button>
          <button class="btn btn-ghost" @click="startDemo">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 5.6c0-1.1 1.2-1.8 2.2-1.2l9 6.4c.9.6.9 1.9 0 2.5l-9 6.4c-1 .7-2.2 0-2.2-1.2V5.6Z" fill="currentColor" />
            </svg>
            试听示例
          </button>
          <span class="drop-hint">支持 .mid / .midi，或直接拖入下方播放器</span>
        </div>
      </section>

      <section class="library">
        <div class="library-head">
          <div>
            <h2>示例曲库</h2>
            <p>点击即载入，音符会从上往下落到键盘上 · 古典乐谱取自 Mutopia Project</p>
          </div>
          <span class="panel-tag">{{ DEMO_SONGS.length }} 首</span>
        </div>
        <div class="demo-grid">
          <button
            v-for="(demo, index) in DEMO_SONGS"
            :key="demo.id"
            class="demo-card"
            :class="{
              active: song?.id === demo.id,
              playing: song?.id === demo.id && playing,
            }"
            :style="{ '--dc': TRACK_COLORS[index % TRACK_COLORS.length] }"
            @click="onDemoClick(demo.id)"
          >
            <span class="demo-top">
              <span class="demo-tag">{{ demo.tag }}</span>
              <span class="demo-index">0{{ index + 1 }}</span>
            </span>
            <strong class="demo-title">{{ demo.title }}</strong>
            <span class="demo-composer">{{ demo.composer }}</span>
            <span class="demo-meta">
              {{ Math.round(demo.bpm) }} BPM · {{ formatTime(demo.duration) }}
            </span>
            <span class="demo-play" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M8.5 5.6c0-1.1 1.2-1.8 2.2-1.2l9 6.4c.9.6.9 1.9 0 2.5l-9 6.4c-1 .7-2.2 0-2.2-1.2V5.6Z" fill="currentColor" />
              </svg>
            </span>
          </button>
        </div>
      </section>

      <section
        ref="stageRef"
        class="stage glass"
        :class="{ 'is-dragging': dragging }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="stage-head">
          <div class="song-info">
            <div class="song-icon" :class="{ live: playing }">
              <div v-if="playing" class="eq" aria-hidden="true">
                <i></i><i></i><i></i><i></i>
              </div>
              <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18V5l10-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="song-text">
              <div class="song-title-row">
                <h2>{{ song ? song.title : '播放器就绪' }}</h2>
                <span v-if="song?.isDemo" class="badge">DEMO</span>
                <span v-if="song && !song.isDemo" class="badge midi">MIDI</span>
              </div>
              <p>{{ song ? metaLine : '拖入 MIDI 文件开始，或先听一段示例旋律' }}</p>
            </div>
          </div>

          <div class="stage-actions">
            <span v-if="loading" class="status-chip" role="status">
              <span class="spinner"></span>解析中
            </span>
            <span v-else-if="error" class="status-chip error" role="status">{{ error }}</span>
            <button class="btn btn-mini" @click="pickFile">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15.5V4m0 0L7.8 8.2M12 4l4.2 4.2M5 15.5v2.7A2.8 2.8 0 0 0 7.8 21h8.4a2.8 2.8 0 0 0 2.8-2.8v-2.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ song ? '更换 MIDI' : '载入 MIDI' }}
            </button>
          </div>
        </div>

        <TransportBar
          :has-song="!!song"
          :playing="playing"
          :position="position"
          :duration="duration"
          :loop="loop"
          :bpm="bpm"
          @play="playSong"
          @pause="pauseSong"
          @stop="stopSong"
          @seek="seekTo"
          @toggle-loop="toggleLoop"
        />

        <div class="keyboard-block">
          <div class="keyboard-head">
            <div>
              <h3>演奏键盘</h3>
              <p>{{ rangeLabel }} · 键盘 / 鼠标 / 触屏</p>
            </div>
            <div class="octave-control">
              <button
                class="oct-button"
                :disabled="octave <= 1"
                aria-label="降低八度"
                @click="shiftOctave(-1)"
              >
                −
              </button>
              <span class="octave-label">{{ rangeLabel }}</span>
              <button
                class="oct-button"
                :disabled="octave >= 3"
                aria-label="升高八度"
                @click="shiftOctave(1)"
              >
                +
              </button>
            </div>
          </div>

          <div class="keyboard-scroll">
            <div class="keyboard-stage">
              <FallingNotes
                :notes="song?.notes ?? []"
                :position="position"
                :bpm="bpm"
                :keys="keys"
                :white-count="whiteCount"
              />
              <PianoKeyboard
                :whites="whites"
                :blacks="blacks"
                :white-count="whiteCount"
                :bindings="bindings"
                :is-active="isNoteActive"
                @note-on="noteOn"
                @note-off="noteOff"
              />
              <div v-if="loading" class="stage-loading">
                <span class="spinner big"></span>
              </div>
            </div>
          </div>

          <div class="keyboard-hints">
            <span><kbd>Z</kbd><kbd>M</kbd> 低音区</span>
            <span><kbd>Q</kbd><kbd>U</kbd> 高音区</span>
            <span><kbd>Shift</kbd> 延音</span>
            <span><kbd>Space</kbd> 播放 / 暂停</span>
            <span><kbd>←</kbd><kbd>→</kbd> 快退 / 快进</span>
            <span class="touch-note">触摸屏支持多指演奏</span>
          </div>
        </div>

        <div v-if="dragging" class="drop-overlay">
          <div class="drop-card">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 15.5V4m0 0L7.8 8.2M12 4l4.2 4.2M5 15.5v2.7A2.8 2.8 0 0 0 7.8 21h8.4a2.8 2.8 0 0 0 2.8-2.8v-2.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <strong>松手载入 MIDI</strong>
            <span>支持 .mid 与 .midi 文件</span>
          </div>
        </div>
      </section>

      <section class="panels">
        <article class="panel glass">
          <header class="panel-head">
            <div>
              <h2>音色引擎</h2>
              <p>切换即刻生效，尾音自然衰减</p>
            </div>
            <span class="panel-tag">Poly · Reverb</span>
          </header>

          <div class="preset-grid">
            <button
              v-for="(preset, index) in PRESETS"
              :key="preset.id"
              class="preset-card"
              :class="{ active: presetId === preset.id }"
              :style="{ '--pc': preset.color }"
              @click="setPreset(preset.id)"
            >
              <span class="preset-top">
                <span class="preset-index">0{{ index + 1 }}</span>
                <span class="preset-dot"></span>
              </span>
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-en">{{ preset.en }}</span>
              <span class="preset-desc">{{ preset.desc }}</span>
            </button>
          </div>
        </article>

        <article class="panel glass">
          <header class="panel-head">
            <div>
              <h2>演奏设置</h2>
              <p>偏好会自动保存</p>
            </div>
            <span class="panel-tag">Live</span>
          </header>

          <div class="settings">
            <div class="setting-row">
              <div class="setting-label">
                <span>主音量</span>
                <span class="setting-value">{{ volume }}%</span>
              </div>
              <input
                class="slider"
                type="range"
                min="0"
                max="100"
                step="1"
                :value="volume"
                :style="{ '--pct': `${volume}%` }"
                aria-label="主音量"
                @input="onVolumeInput"
              />
            </div>

            <div class="setting-row inline">
              <div class="setting-label">
                <span>延音踏板</span>
                <kbd class="inline-kbd">Shift</kbd>
              </div>
              <button
                class="toggle"
                :class="{ on: sustainOn }"
                aria-label="延音踏板"
                @click="toggleSustain"
              >
                <span></span>
              </button>
            </div>

            <div class="setting-row inline">
              <div class="setting-label">
                <span>节拍器</span>
                <small>{{ metronomeBpm }} BPM</small>
              </div>
              <div class="setting-right">
                <div class="beats" aria-hidden="true">
                  <i
                    v-for="n in 4"
                    :key="n"
                    :class="{ on: metronomeOn && beat === n - 1, accent: n === 1 }"
                  ></i>
                </div>
                <button
                  class="toggle"
                  :class="{ on: metronomeOn }"
                  aria-label="节拍器"
                  @click="toggleMetronome"
                >
                  <span></span>
                </button>
              </div>
            </div>

            <div v-if="metronomeOn" class="setting-row">
              <div class="setting-label">
                <span>节拍速度</span>
                <span class="setting-value">{{ metronomeBpm }} BPM</span>
              </div>
              <input
                class="slider"
                type="range"
                min="50"
                max="200"
                step="1"
                :value="metronomeBpm"
                :style="{ '--pct': `${metronomePercent}%` }"
                aria-label="节拍器速度"
                @input="onBpmInput"
              />
            </div>
          </div>
        </article>
      </section>

      <footer class="footer">
        <div class="footer-line"><span class="footer-dot"></span>Vue 3 · Vite · TypeScript · Tone.js · Canvas</div>
        <p>用代码，让每一次按键都有回响。</p>
      </footer>
    </main>

    <input
      ref="fileInput"
      class="file-input"
      type="file"
      accept=".mid,.midi,audio/midi,audio/x-midi"
      @change="handleFile"
    />
  </div>
</template>
