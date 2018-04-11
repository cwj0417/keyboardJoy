<template>
  <div style='height: 400px;'></div>
</template>
<script type='text/ecmascript-6'>
  import colors from '../../../config/colors'
  import kbConfig from '../../keyboard/config'
  import event from '../../eventBus'
  let lastPlay = Date.now()
  let isPlaying = false

  let kbMap = {}
  for (let {name, pos} of kbConfig) {
    if (name.push) {
      kbMap[name[0]] = pos
      kbMap[name[1]] = pos
    } else {
      kbMap[name] = pos
    }
  }

  const getCanvasSize = (el) => {
    return [el.clientWidth, el.clientHeight]
  }

  const clear = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)
  }

  const render = (ctx, midi, height, width, tickHeight, current) => {
    if (!midi) {
      return
    }
    ctx.beginPath()
    const w = width * 0.0192308

    const rectPath = (name, time, duration, colors) => {
      const color = name.length === 2 ? colors[0] : colors[1]
      let kw = name.length === 2 ? w : w - 8
      let sp = name.length === 2 ? height - (time + duration - current) * tickHeight : height - (time + duration - current) * tickHeight - 4

      ctx.rect(kbMap[name] * w, sp, kw, tickHeight * duration)
      ctx.fillStyle = color
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
    }

    const tracks = midi.tracks
      .filter(item => item.notes.length)
      .map(item => item.notes.map(({name, time, duration}) => ({name, time, duration})))
    tracks.forEach((track, index) => {
      for (let {name, time, duration} of track) {
        if ((time + duration - current) * tickHeight > 0 && (height - (time - current) * tickHeight) > 0) { // judge the note was in view
          rectPath(name, time, duration, colors[index])
        }
      }
    })
    ctx.closePath()
  }

  export default {
    props: ['midi'],
    mounted () {
      // audio status
      event.$on('play', () => {
        lastPlay = Date.now()
        isPlaying = true
      })
      event.$on('pause', () => {
        isPlaying = false
      })
      event.$on('stop', () => {
        isPlaying = false
      })
      // canvas
      let [width, height] = getCanvasSize(this.$el)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      this.$el.appendChild(canvas)
      const ctx = canvas.getContext('2d')

      const loop = () => {
        clear(ctx, width, height)
        render(ctx, this.midi, height, width, 200, (Date.now() - lastPlay) / 1000)
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }
  }
</script>
