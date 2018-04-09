<template>
  <div>
    <input type='file' @change='readMidi'/>
    <button @click='play'>play</button>
    <button @click='pause'>pause</button>
    <div class="kb-wrap">
      <KB keyName='a' :playing='playing.a'></KB>
      <KB keyName='s' :playing='playing.s'></KB>
      <KB keyName='d' :playing='playing.d'></KB>
      <KB keyName='f' :playing='playing.f'></KB>
      <KB keyName='g' :playing='playing.g'></KB>
      <KB keyName='h' :playing='playing.h'></KB>
      <KB keyName='j' :playing='playing.j'></KB>
      <KB keyName='k' :playing='playing.k'></KB>
      <KB keyName='l' :playing='playing.l'></KB>
    </div>
  </div>
</template>

<script type='text/ecmascript-6'>
  import play from '../api/play'
  import KB from './singleKeyboard.vue'
  import Tone from 'tone'
  import {load, parse} from 'midiconvert'
  let midi = null

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
        loaded: false
      }
    },
    methods: {
      readMidi (e) {
        let file = e.target.files[0]

        const reader = new FileReader()

        reader.onload = e => {
          midi = parse(e.target.result)
          this.play()
        }

        reader.readAsBinaryString(file)
      },

      play () {
        if (midi) {
          if (!this.loaded) {
            let synth = new Tone.PolySynth(8).toMaster()

            Tone.Transport.bpm.value = midi.header.bpm

            for (let {notes} of midi.tracks) {
              new Tone.Part(function (time, note) {
                synth.triggerAttackRelease(note.name, note.duration, time, note.velocity)
              }, notes).start()
            }
            this.loaded = true
          }

          Tone.Transport.start()
        }
      },

      pause () {
        Tone.Transport.pause()
      }

    },

    components: {KB},

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

<style scoped>
    .kb-wrap {
        display: flex
     }

</style>
