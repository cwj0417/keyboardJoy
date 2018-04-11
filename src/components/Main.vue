<template>
  <div>
    <input type='file' @change='readMidi'/>
    <button @click='play'>play</button>
    <button @click='pause'>pause</button>
    <button @click='stop'>stop</button>
    <div class="tune-wrap">
      <tune :midi='midi' />
    </div>
    <div class="kb-wrap">
      <keyboard />
    </div>
  </div>
</template>

<script type='text/ecmascript-6'>
  import play from '../api/play'
  import KB from './singleKeyboard.vue'
  import Tone from 'tone'
  import {load, parse} from 'midiconvert'
  import keyboard from './keyboard/keyboard.vue'
  import event from './eventBus'
  import tune from './tune/tune.vue'

  export default {
    data () {
      return {
        playing: {
          a: false,
          s: false,
          d: false,
          f: false,
          g: false,
          h: false,
          j: false,
          k: false,
          l: false
        },
        loaded: false,
        midi: null
      }
    },
    methods: {
      readMidi (e) {
        let file = e.target.files[0]

        const reader = new FileReader()

        reader.onload = e => {
          this.midi = parse(e.target.result)
          this.play()
        }

        reader.readAsBinaryString(file)
      },

      play () {
        if (this.midi) {
          if (!this.loaded) {
            let synth = new Tone.PolySynth(8).toMaster()

            Tone.Transport.bpm.value = this.midi.header.bpm

            for (let {notes} of this.midi.tracks) {
              new Tone.Part(function (time, note) {
                event.$emit(`attackRelease-${note.name}`, note.duration)
                synth.triggerAttackRelease(note.name, note.duration, Tone.now(), note.velocity)
              }, notes).start()
            }
            this.loaded = true
          }
          event.$emit('play')
          Tone.Transport.start()
        }
      },

      pause () {
        event.$emit('pause')
        Tone.Transport.pause()
      },

      stop () {
        event.$emit('stop')
        Tone.Transport.stop()
      }

    },

    components: {KB, keyboard, tune},

    mounted () {
      document.addEventListener('keydown', e => {
        if (!this.playing[e.key]) {
          this.playing[e.key] = true
          play.down(e.key)
        }
      })

      document.addEventListener('keyup', e => {
        this.playing[e.key] = false
        play.up()
      })
    }
  }
</script>

<style>

</style>
