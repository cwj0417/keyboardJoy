import Tone from 'tone'

import keymap from '../config/keymap'

const synth = new Tone.Synth().toMaster()

export default {
  down (key) {
    synth.triggerAttack(keymap[key])
  },
  up () {
    synth.triggerRelease()
  },
  press (...params) {
    synth.triggerAttackRelease(...params)
  }
}
