export type VoiceKind = 'fm' | 'am' | 'synth'

export interface SynthPreset {
  id: string
  name: string
  en: string
  desc: string
  color: string
  voice: VoiceKind
  volume: number
  options: Record<string, unknown>
}

export const PRESETS: SynthPreset[] = [
  {
    id: 'grand',
    name: '三角钢琴',
    en: 'Concert Grand',
    desc: '通透 · 自然衰减',
    color: '#a78bfa',
    voice: 'fm',
    volume: -6,
    options: {
      // harmonicity 必须是 1，否则基频被淹没，听起来音高会“不对”
      harmonicity: 1,
      modulationIndex: 3.2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.5, sustain: 0.035, release: 0.45 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.002, decay: 0.28, sustain: 0, release: 0.12 },
    },
  },
  {
    id: 'electric',
    name: '电钢琴',
    en: 'Electric Keys',
    desc: '清脆 · 复古颗粒',
    color: '#22d3ee',
    voice: 'am',
    volume: -6,
    options: {
      harmonicity: 2.02,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.003, decay: 0.7, sustain: 0.22, release: 0.9 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.005, decay: 0.28, sustain: 0.1, release: 0.3 },
    },
  },
  {
    id: 'pad',
    name: '氛围铺底',
    en: 'Aurora Pad',
    desc: '柔和 · 宽广空间',
    color: '#34d399',
    voice: 'synth',
    volume: -13,
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 36 },
      envelope: { attack: 0.45, decay: 0.9, sustain: 0.7, release: 2.6 },
    },
  },
  {
    id: 'bell',
    name: '星尘钟琴',
    en: 'Stardust Bell',
    desc: '晶莹 · 空灵泛音',
    color: '#f472b6',
    voice: 'fm',
    volume: -10,
    options: {
      harmonicity: 8.01,
      modulationIndex: 11,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 1.4 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.4 },
    },
  },
]

export const getPreset = (id: string) =>
  PRESETS.find((preset) => preset.id === id) ?? PRESETS[0]
