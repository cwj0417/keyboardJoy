import { midiToName, nameToMidi } from '../lib/notes'
import { DANUBE_SCORE, ELISE_SCORE, NOCTURNE_SCORE, TURKISH_SCORE } from './scores'
import type { NoteEvent, ScoreClip, Song } from '../types'

interface NoteSpec {
  name: string
  /** 起始拍，四分音符为一拍 */
  beat: number
  /** 持续拍数 */
  beats: number
  velocity?: number
  track?: number
}

interface SongDraft {
  id: string
  title: string
  subtitle: string
  composer: string
  tag: string
  bpm: number
  beats: number
  trackCount: number
  notes: NoteSpec[]
}

const toSong = (draft: SongDraft): Song => {
  const beatSeconds = 60 / draft.bpm
  const notes: NoteEvent[] = draft.notes.map((note) => ({
    name: note.name,
    midi: nameToMidi(note.name),
    time: note.beat * beatSeconds,
    duration: Math.max(0.04, note.beats * beatSeconds),
    velocity: note.velocity ?? 0.62,
    track: note.track ?? 0,
  }))

  const end = notes.reduce((max, note) => Math.max(max, note.time + note.duration), 0)

  return {
    id: draft.id,
    title: draft.title,
    subtitle: draft.subtitle,
    composer: draft.composer,
    tag: draft.tag,
    bpm: draft.bpm,
    duration: Math.max(end, draft.beats * beatSeconds, 0.5),
    notes,
    trackCount: draft.trackCount,
    isDemo: true,
  }
}

const fromScore = (clip: ScoreClip): NoteSpec[] =>
  clip.notes.map(([midi, beat, beats, velocity, track]) => ({
    name: midiToName(midi),
    beat,
    beats,
    velocity,
    track,
  }))

/* ------------------------------------------------------------------ */
/* 1. 卡农                                                             */
/* ------------------------------------------------------------------ */

const buildCanon = () => {
  const notes: NoteSpec[] = []
  const add = (name: string, beat: number, beats: number, velocity: number, track: number) => {
    notes.push({ name, beat, beats, velocity, track })
  }

  // 帕赫贝尔卡农的固定和声：每个和弦持续两拍，四小节一循环
  const harmony: { bass: string; tones: string[] }[] = [
    { bass: 'D3', tones: ['D4', 'F#4', 'A4', 'D5'] },
    { bass: 'A2', tones: ['C#4', 'E4', 'A4', 'C#5'] },
    { bass: 'B2', tones: ['B3', 'D4', 'F#4', 'B4'] },
    { bass: 'F#2', tones: ['A3', 'C#4', 'F#4', 'A4'] },
    { bass: 'G2', tones: ['G3', 'B3', 'D4', 'G4'] },
    { bass: 'D3', tones: ['F#3', 'A3', 'D4', 'F#4'] },
    { bass: 'G2', tones: ['G3', 'B3', 'D4', 'G4'] },
    { bass: 'A2', tones: ['A3', 'C#4', 'E4', 'A4'] },
  ]

  // 四段变奏的旋律，每段 16 拍（8 个和弦）
  const variations: [string, number][][] = [
    // 主题：全音符级进下行
    [
      ['F#5', 2], ['E5', 2], ['D5', 2], ['C#5', 2],
      ['B4', 2], ['A4', 2], ['G4', 2], ['F#4', 2],
    ],
    // 上行模进
    [
      ['G4', 2], ['A4', 2], ['B4', 2], ['C#5', 2],
      ['D5', 2], ['E5', 2], ['D5', 2], ['C#5', 2],
    ],
    // 四分音符简化
    [
      ['F#5', 1], ['E5', 1], ['D5', 1], ['C#5', 1],
      ['B4', 1], ['A4', 1], ['G4', 1], ['F#4', 1],
      ['G4', 1], ['A4', 1], ['B4', 1], ['C#5', 1],
      ['D5', 1], ['E5', 1], ['F#5', 1], ['E5', 1],
    ],
    // 回到主题，收束在属和弦
    [
      ['F#5', 2], ['E5', 2], ['D5', 2], ['C#5', 2],
      ['B4', 2], ['A4', 2], ['G4', 2], ['A4', 2],
    ],
  ]

  const passes = [0, 12]
  passes.forEach((transpose, passIndex) => {
    variations.forEach((melody, variationIndex) => {
      const start = (passIndex * variations.length + variationIndex) * 16
      harmony.forEach((chord, index) => {
        const beat = start + index * 2
        add(chord.bass, beat, 2, 0.52, 2)
        ;[0, 1, 2, 3].forEach((tone, step) => {
          add(chord.tones[tone], beat + step * 0.5, 0.46, step === 0 ? 0.4 : 0.32, 1)
        })
      })
      let cursor = 0
      melody.forEach(([name, length]) => {
        const noteName = transpose ? midiToName(nameToMidi(name) + transpose) : name
        add(noteName, start + cursor, length * 0.96, 0.72, 0)
        cursor += length
      })
    })
  })

  const totalBeats = passes.length * variations.length * 16
  // 终止和弦
  const finalBeat = totalBeats
  add('D3', finalBeat, 2, 0.55, 2)
  ;['D4', 'F#4', 'A4', 'D5'].forEach((name, index) => {
    add(name, finalBeat + index * 0.02, 1.9, 0.42, 1)
  })
  add('D5', finalBeat, 2, 0.7, 0)

  return toSong({
    id: 'canon',
    title: 'Canon in D',
    subtitle: '帕赫贝尔 · 卡农',
    composer: 'J. Pachelbel',
    tag: '巴洛克',
    bpm: 84,
    beats: totalBeats + 2,
    trackCount: 3,
    notes,
  })
}

/* ------------------------------------------------------------------ */
/* 2. 致爱丽丝（Mutopia 校正乐谱）                                       */
/* ------------------------------------------------------------------ */

const buildElise = () =>
  toSong({
    id: 'elise',
    title: 'Für Elise',
    subtitle: '贝多芬 · 钢琴小品 WoO 59',
    composer: 'L. van Beethoven',
    tag: '古典',
    bpm: ELISE_SCORE.bpm,
    beats: ELISE_SCORE.beats,
    trackCount: ELISE_SCORE.trackCount,
    notes: fromScore(ELISE_SCORE),
  })

/* ------------------------------------------------------------------ */
/* 3. 蓝色多瑙河（Mutopia 校正乐谱）                                     */
/* ------------------------------------------------------------------ */

const buildDanube = () => {
  const first = fromScore(DANUBE_SCORE)
  const second = first.map((note) => ({ ...note, beat: note.beat + DANUBE_SCORE.beats }))
  return toSong({
    id: 'danube',
    title: 'The Blue Danube',
    subtitle: '小约翰·施特劳斯 · 圆舞曲主题（两遍）',
    composer: 'Johann Strauss II',
    tag: '圆舞曲',
    bpm: DANUBE_SCORE.bpm,
    beats: DANUBE_SCORE.beats * 2,
    trackCount: DANUBE_SCORE.trackCount,
    notes: [...first, ...second],
  })
}

/* ------------------------------------------------------------------ */
/* 4. 土耳其进行曲（Mutopia 校正乐谱）                                   */
/* ------------------------------------------------------------------ */

const buildTurkish = () =>
  toSong({
    id: 'turkish',
    title: 'Turkish March',
    subtitle: '莫扎特 · 钢琴奏鸣曲 K.331',
    composer: 'W. A. Mozart',
    tag: '古典',
    bpm: TURKISH_SCORE.bpm,
    beats: TURKISH_SCORE.beats,
    trackCount: TURKISH_SCORE.trackCount,
    notes: fromScore(TURKISH_SCORE),
  })

/* ------------------------------------------------------------------ */
/* 5. 夜曲 Op.9 No.2（Mutopia 校正乐谱）                                 */
/* ------------------------------------------------------------------ */

const buildNocturne = () =>
  toSong({
    id: 'nocturne',
    title: 'Nocturne Op.9 No.2',
    subtitle: '肖邦 · 降 E 大调夜曲',
    composer: 'F. Chopin',
    tag: '浪漫主义',
    bpm: NOCTURNE_SCORE.bpm,
    beats: NOCTURNE_SCORE.beats,
    trackCount: NOCTURNE_SCORE.trackCount,
    notes: fromScore(NOCTURNE_SCORE),
  })

export const DEMO_SONGS: Song[] = [
  buildElise(),
  buildDanube(),
  buildTurkish(),
  buildNocturne(),
  buildCanon(),
]
