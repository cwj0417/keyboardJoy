export interface NoteEvent {
  midi: number
  name: string
  time: number
  duration: number
  velocity: number
  track: number
}

export interface Song {
  title: string
  subtitle: string
  duration: number
  bpm: number
  notes: NoteEvent[]
  trackCount: number
  isDemo?: boolean
  /** 示例曲标识 */
  id?: string
  composer?: string
  tag?: string
}

/** 从 MIDI 提取的乐谱片段，音符为 [midi, 起始拍, 持续拍, 力度, 音轨] */
export interface ScoreClip {
  bpm: number
  beats: number
  trackCount: number
  notes: [number, number, number, number, number][]
}
