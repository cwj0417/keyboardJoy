const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const isBlackMidi = (midi: number) =>
  BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12)

export const midiToName = (midi: number) =>
  `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`

export const nameToMidi = (name: string) => {
  // 同时支持升号（C#4）与降号（Eb2），降号不能丢：否则整首曲子的音高都会错
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(name)
  if (!match) return 60
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
  return (Number(match[3]) + 1) * 12 + LETTER_SEMITONES[match[1]] + accidental
}

export interface KeyDef {
  midi: number
  name: string
  black: boolean
  /** 黑键左侧的白键数量，也用于计算黑键位置 */
  boundary: number
}

export interface KeyboardLayout {
  keys: KeyDef[]
  whites: KeyDef[]
  blacks: KeyDef[]
  whiteCount: number
}

export function buildKeyboard(startMidi: number, endMidi: number): KeyboardLayout {
  const keys: KeyDef[] = []
  let whiteCount = 0

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const black = isBlackMidi(midi)
    keys.push({
      midi,
      name: midiToName(midi),
      black,
      boundary: whiteCount,
    })
    if (!black) whiteCount++
  }

  return {
    keys,
    whites: keys.filter((key) => !key.black),
    blacks: keys.filter((key) => key.black),
    whiteCount,
  }
}

/** 电脑键盘映射，偏移量以当前八度起始 C 为 0，共覆盖两个八度 + 高音 C */
export const KEY_BINDINGS: Record<string, number> = {
  KeyZ: 0,
  KeyS: 1,
  KeyX: 2,
  KeyD: 3,
  KeyC: 4,
  KeyV: 5,
  KeyG: 6,
  KeyB: 7,
  KeyH: 8,
  KeyN: 9,
  KeyJ: 10,
  KeyM: 11,
  KeyQ: 12,
  Digit2: 13,
  KeyW: 14,
  Digit3: 15,
  KeyE: 16,
  KeyR: 17,
  Digit5: 18,
  KeyT: 19,
  Digit6: 20,
  KeyY: 21,
  Digit7: 22,
  KeyU: 23,
  KeyI: 24,
}

export const bindingLabel = (code: string) => {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code
}

export const TRACK_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#60a5fa',
  '#fb923c',
  '#e879f9',
]

export const formatTime = (seconds: number, precise = false) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (precise) {
    return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`
  }
  return `${minutes}:${Math.floor(rest).toString().padStart(2, '0')}`
}
