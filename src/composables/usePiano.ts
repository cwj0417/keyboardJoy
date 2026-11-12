import { computed, reactive, ref } from 'vue'
import { Midi } from '@tonejs/midi'
import { PianoEngine } from '../audio/engine'
import { getPreset } from '../audio/presets'
import { buildKeyboard, bindingLabel, clamp, KEY_BINDINGS, midiToName } from '../lib/notes'
import { DEMO_SONGS } from '../data/demos'
import type { NoteEvent, Song } from '../types'

interface StoredSettings {
  preset?: string
  volume?: number
  octave?: number
  metronomeBpm?: number
}

const STORAGE_KEY = 'keyboardjoy:settings'

const readSettings = (): StoredSettings => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredSettings
  } catch {
    return {}
  }
}

const stored = readSettings()

const song = ref<Song | null>(null)
const playing = ref(false)
const position = ref(0)
const loop = ref(false)
const loading = ref(false)
const error = ref('')

const volume = ref(clamp(Number(stored.volume ?? 80), 0, 100))
const presetId = ref(getPreset(stored.preset ?? 'grand').id)
const octave = ref(clamp(Number(stored.octave ?? 3), 1, 3))
const metronomeOn = ref(false)
const metronomeBpm = ref(clamp(Number(stored.metronomeBpm ?? 100), 50, 200))
const beat = ref(-1)

const sustainLatch = ref(false)
const shiftHeld = ref(false)
const sustainOn = computed(() => sustainLatch.value || shiftHeld.value)

const userActive = reactive(new Map<string, number>())
const midiActive = reactive(new Map<string, number>())
const heldNotes = new Set<string>()
const sustainedNotes = new Set<string>()
const midiTimers = new Set<number>()

let engine: PianoEngine | null = null
let clockRunning = false
let persistTimer = 0

const addCount = (map: Map<string, number>, name: string) => {
  map.set(name, (map.get(name) ?? 0) + 1)
}

const removeCount = (map: Map<string, number>, name: string) => {
  const next = (map.get(name) ?? 0) - 1
  if (next > 0) map.set(name, next)
  else map.delete(name)
}

const clearMidiHighlights = () => {
  midiTimers.forEach((timer) => window.clearTimeout(timer))
  midiTimers.clear()
  midiActive.clear()
}

const persistSettings = () => {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          preset: presetId.value,
          volume: volume.value,
          octave: octave.value,
          metronomeBpm: metronomeBpm.value,
        }),
      )
    } catch {
      // 忽略隐私模式下的存储失败
    }
  }, 250)
}

const ensureEngine = () => {
  if (!engine) {
    engine = new PianoEngine()
    engine.callbacks = {
      onMidiNote(name, duration) {
        addCount(midiActive, name)
        const timer = window.setTimeout(() => {
          midiTimers.delete(timer)
          removeCount(midiActive, name)
        }, Math.max(140, duration * 1000 + 40))
        midiTimers.add(timer)
      },
      onBeat(value) {
        beat.value = value
      },
    }
    engine.setVolume(volume.value / 100)
    engine.setPreset(getPreset(presetId.value))
    engine.setLoop(loop.value)
  }
  return engine
}

const finishPlayback = () => {
  engine?.pause()
  engine?.seek(0)
  playing.value = false
  position.value = 0
  clearMidiHighlights()
}

const startClock = () => {
  if (clockRunning) return
  clockRunning = true

  const tick = () => {
    if (playing.value && engine && song.value) {
      const current = engine.position
      position.value = current
      if (!loop.value && current >= song.value.duration - 0.04) {
        finishPlayback()
      }
    }
    window.requestAnimationFrame(tick)
  }

  window.requestAnimationFrame(tick)
}

const fitOctaveToSong = (notes: NoteEvent[]) => {
  if (!notes.length) return

  let low = Infinity
  let high = -Infinity
  for (const note of notes) {
    if (note.midi < low) low = note.midi
    if (note.midi > high) high = note.midi
  }

  let best = octave.value
  let bestCovered = -1

  for (let candidate = 1; candidate <= 3; candidate++) {
    const start = 12 * (candidate + 1)
    const end = start + 60
    let covered = 0
    for (const note of notes) {
      if (note.midi >= start && note.midi <= end) covered++
    }
    if (covered > bestCovered) {
      bestCovered = covered
      best = candidate
    }
  }

  // 能完整容纳时，选离曲子中心最近的那一段，避免大量空键
  const center = (low + high) / 2
  let bestDistance = Infinity
  for (let candidate = 1; candidate <= 3; candidate++) {
    const start = 12 * (candidate + 1)
    if (low >= start && high <= start + 60) {
      const distance = Math.abs(center - (start + 30))
      if (distance < bestDistance) {
        bestDistance = distance
        best = candidate
      }
    }
  }

  if (best !== octave.value) {
    octave.value = best
    persistSettings()
  }
}

const loadSong = (next: Song) => {
  const audio = ensureEngine()
  audio.stop()
  fitOctaveToSong(next.notes)
  audio.loadSong(next.notes, next.bpm, next.duration)
  audio.setLoop(loop.value)
  song.value = next
  playing.value = false
  position.value = 0
  error.value = ''
  clearMidiHighlights()
}

const playSong = async () => {
  if (!song.value || playing.value) return
  const audio = ensureEngine()
  if (position.value >= song.value.duration - 0.05) {
    audio.seek(0)
    position.value = 0
  }
  await audio.play()
  playing.value = true
}

const pauseSong = () => {
  if (!song.value) return
  const audio = ensureEngine()
  audio.pause()
  playing.value = false
  position.value = audio.position
  clearMidiHighlights()
}

const stopSong = () => {
  if (!song.value) return
  ensureEngine().stop()
  playing.value = false
  position.value = 0
  clearMidiHighlights()
}

const seekTo = (time: number) => {
  if (!song.value) return
  const target = clamp(time, 0, song.value.duration)
  ensureEngine().seek(target)
  position.value = target
  clearMidiHighlights()
}

const toggleLoop = () => {
  loop.value = !loop.value
  ensureEngine().setLoop(loop.value)
}

const playDemo = async (id: string) => {
  const demo = DEMO_SONGS.find((item) => item.id === id) ?? DEMO_SONGS[0]
  loadSong({ ...demo, notes: [...demo.notes] })
  await playSong()
}

const loadMidiFile = async (file: File) => {
  loading.value = true
  error.value = ''

  try {
    if (file.size > 15 * 1024 * 1024) throw new Error('文件过大')
    const buffer = await file.arrayBuffer()
    const midi = new Midi(buffer)

    const notes = midi.tracks.flatMap((track, trackIndex) =>
      track.notes.map((note) => ({
        midi: note.midi,
        name: note.name,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity || 0.7,
        track: trackIndex,
      })),
    )

    if (!notes.length) throw new Error('没有音符')

    const bpm = midi.header.tempos[0]?.bpm ?? 120
    const duration = Math.max(
      midi.duration || 0,
      ...notes.map((note) => note.time + note.duration),
      0.5,
    )

    loadSong({
      title: file.name.replace(/\.[^.]+$/, ''),
      subtitle: `${midi.tracks.filter((track) => track.notes.length).length} 轨 · ${notes.length} 个音符`,
      duration,
      bpm,
      notes,
      trackCount: midi.tracks.length,
    })
    return true
  } catch {
    error.value = '无法解析这个 MIDI 文件，请换一个试试'
    return false
  } finally {
    loading.value = false
  }
}

const releaseSustained = () => {
  if (!sustainedNotes.size) return
  const audio = ensureEngine()
  sustainedNotes.forEach((name) => {
    if (!heldNotes.has(name)) {
      audio.noteOff(name)
      removeCount(userActive, name)
    }
  })
  sustainedNotes.clear()
}

const noteOn = (midi: number) => {
  const name = midiToName(midi)
  if (heldNotes.has(name)) return

  if (sustainedNotes.has(name)) {
    sustainedNotes.delete(name)
  } else {
    addCount(userActive, name)
  }
  heldNotes.add(name)

  const audio = ensureEngine()
  void audio.unlock().then(() => {
    if (heldNotes.has(name) || sustainedNotes.has(name)) {
      audio.noteOn(name)
    }
  })
}

const noteOff = (midi: number) => {
  const name = midiToName(midi)
  if (!heldNotes.has(name)) return
  heldNotes.delete(name)

  if (sustainOn.value) {
    sustainedNotes.add(name)
    return
  }

  ensureEngine().noteOff(name)
  removeCount(userActive, name)
}

const releaseAllUser = () => {
  const names = [...new Set([...heldNotes, ...sustainedNotes])]
  if (names.length) ensureEngine().releaseNotes(names)
  heldNotes.clear()
  sustainedNotes.clear()
  userActive.clear()
}

const toggleSustain = () => {
  sustainLatch.value = !sustainLatch.value
  if (!sustainOn.value) releaseSustained()
}

const setShiftHeld = (value: boolean) => {
  shiftHeld.value = value
  if (!sustainOn.value) releaseSustained()
}

const baseMidi = computed(() => 12 * (octave.value + 1))
const layout = computed(() => buildKeyboard(baseMidi.value, baseMidi.value + 60))
const keys = computed(() => layout.value.keys)
const whites = computed(() => layout.value.whites)
const blacks = computed(() => layout.value.blacks)
const whiteCount = computed(() => layout.value.whiteCount)
const rangeLabel = computed(() => `C${octave.value} – C${octave.value + 5}`)
const bindings = computed(() => {
  const map: Record<number, string> = {}
  for (const [code, offset] of Object.entries(KEY_BINDINGS)) {
    map[baseMidi.value + offset] = bindingLabel(code)
  }
  return map
})

const shiftOctave = (delta: number) => {
  const next = clamp(octave.value + delta, 1, 3)
  if (next === octave.value) return
  releaseAllUser()
  octave.value = next
  persistSettings()
}

const setPreset = (id: string) => {
  presetId.value = id
  ensureEngine().setPreset(getPreset(id))
  persistSettings()
}

const setVolume = (value: number) => {
  volume.value = clamp(Math.round(value), 0, 100)
  ensureEngine().setVolume(volume.value / 100)
  persistSettings()
}

const toggleMetronome = async () => {
  const audio = ensureEngine()
  if (metronomeOn.value) {
    audio.stopMetronome()
    metronomeOn.value = false
    beat.value = -1
    return
  }
  await audio.unlock()
  audio.startMetronome(metronomeBpm.value)
  metronomeOn.value = true
}

const setMetronomeBpm = (value: number) => {
  metronomeBpm.value = clamp(Math.round(value), 50, 200)
  engine?.setMetronomeBpm(metronomeBpm.value)
  persistSettings()
}

const isNoteActive = (name: string) =>
  (userActive.get(name) ?? 0) + (midiActive.get(name) ?? 0) > 0

let initialized = false

export function usePiano() {
  if (!initialized) {
    initialized = true
    ensureEngine()
    startClock()
  }

  return {
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
    sustainLatch,
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
    clearMidiHighlights,
  }
}
