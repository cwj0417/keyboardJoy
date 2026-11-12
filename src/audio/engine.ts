import * as Tone from 'tone'
import { getPreset, type SynthPreset } from './presets'
import type { NoteEvent } from '../types'

interface EngineCallbacks {
  onMidiNote?: (name: string, duration: number) => void
  onBeat?: (beat: number) => void
}

export class PianoEngine {
  private synth: Tone.PolySynth | null = null
  private filter: Tone.Filter
  private reverb: Tone.Reverb
  private compressor: Tone.Compressor
  private master: Tone.Volume
  private metronomeSynth: Tone.Synth
  private transport = Tone.getTransport()
  private scheduledIds: number[] = []
  private metronomeTimer: number | null = null
  private metronomeNext = 0
  private metronomeBeat = 0
  private metronomeBpm = 100
  private presetId = ''

  callbacks: EngineCallbacks = {}

  constructor() {
    this.master = new Tone.Volume(-2).toDestination()
    this.compressor = new Tone.Compressor(-16, 3).connect(this.master)
    this.reverb = new Tone.Reverb({ decay: 2.6, preDelay: 0.015, wet: 0.18 })
    this.reverb.connect(this.compressor)
    void this.reverb.generate?.().catch(() => undefined)
    // 轻收高频，避免 FM 合成的金属感过亮
    this.filter = new Tone.Filter({ type: 'lowpass', frequency: 5200, Q: 0.4 }).connect(this.reverb)

    this.metronomeSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      volume: -16,
    }).connect(this.master)

    this.setPreset(getPreset('grand'))
  }

  get currentPreset() {
    return this.presetId
  }

  async unlock() {
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }
  }

  setPreset(preset: SynthPreset) {
    if (this.presetId === preset.id) return

    const previous = this.synth
    if (previous) {
      previous.releaseAll()
      window.setTimeout(() => previous.dispose(), 800)
    }

    const Voice =
      preset.voice === 'fm' ? Tone.FMSynth : preset.voice === 'am' ? Tone.AMSynth : Tone.Synth

    const synth = new Tone.PolySynth(Voice as never, {
      ...(preset.options as Record<string, never>),
      volume: preset.volume,
    } as never)
    synth.maxPolyphony = 64
    synth.connect(this.filter)

    this.synth = synth
    this.presetId = preset.id
  }

  noteOn(name: string, velocity = 0.85) {
    this.synth?.triggerAttack(name, Tone.now(), velocity)
  }

  noteOff(name: string) {
    this.synth?.triggerRelease(name)
  }

  releaseNotes(names: string[]) {
    if (!names.length) return
    this.synth?.triggerRelease(names)
  }

  releaseAll() {
    this.synth?.releaseAll()
  }

  setVolume(value: number) {
    const volume = Math.max(0, Math.min(1, value))
    this.master.volume.rampTo(volume <= 0.001 ? -60 : Tone.gainToDb(volume), 0.06)
  }

  loadSong(notes: NoteEvent[], bpm: number, duration: number) {
    this.clearSchedule()
    const transport = this.transport
    transport.stop()
    transport.cancel(0)
    transport.bpm.value = Math.max(20, Math.min(300, bpm))
    transport.loop = false
    transport.loopStart = 0
    transport.loopEnd = Math.max(0.5, duration)
    transport.seconds = 0

    this.scheduledIds = notes.map((note) =>
      transport.schedule((time) => {
        this.synth?.triggerAttackRelease(
          note.name,
          Math.max(0.03, note.duration),
          time,
          Math.max(0.05, note.velocity),
        )
        Tone.getDraw().schedule(() => {
          this.callbacks.onMidiNote?.(note.name, note.duration)
        }, time)
      }, Math.max(0.001, note.time)),
    )
  }

  private clearSchedule() {
    this.scheduledIds.forEach((id) => this.transport.clear(id))
    this.scheduledIds = []
  }

  async play() {
    await this.unlock()
    this.transport.start()
  }

  pause() {
    this.transport.pause()
  }

  stop() {
    this.transport.stop()
    this.transport.seconds = 0
  }

  seek(seconds: number) {
    this.transport.seconds = Math.max(0, seconds)
  }

  get position() {
    return this.transport.seconds
  }

  setLoop(enabled: boolean) {
    this.transport.loop = enabled
  }

  startMetronome(bpm: number) {
    this.stopMetronome()
    this.metronomeBpm = bpm
    this.metronomeBeat = 0
    this.metronomeNext = Tone.now() + 0.15
    this.scheduleMetronome()
    this.metronomeTimer = window.setInterval(this.scheduleMetronome, 25)
  }

  private scheduleMetronome = () => {
    const horizon = Tone.now() + 0.15
    while (this.metronomeNext < horizon) {
      const accent = this.metronomeBeat % 4 === 0
      this.metronomeSynth.triggerAttackRelease(
        accent ? 'C6' : 'G5',
        0.04,
        this.metronomeNext,
        accent ? 0.55 : 0.28,
      )
      const beat = this.metronomeBeat % 4
      Tone.getDraw().schedule(() => this.callbacks.onBeat?.(beat), this.metronomeNext)
      this.metronomeNext += 60 / this.metronomeBpm
      this.metronomeBeat++
    }
  }

  setMetronomeBpm(bpm: number) {
    this.metronomeBpm = bpm
  }

  stopMetronome() {
    if (this.metronomeTimer !== null) {
      window.clearInterval(this.metronomeTimer)
      this.metronomeTimer = null
    }
    this.callbacks.onBeat?.(-1)
  }
}
