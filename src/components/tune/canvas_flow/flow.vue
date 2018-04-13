<template>
  <div style='height: 400px;'></div>
</template>
<script type='text/ecmascript-6'>
  import colors from '../../../config/colors'
  import kbConfig from '../../keyboard/config'
  import event from '../../eventBus'

  let startTime = null
  let curTime = null
  let isPlaying = false
  let isPaused = false
  let isStopped = true
  let isPausing = false

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
    const uw = width * 0.0192308

    const rectPath = (name, time, duration, colors) => {
      const color = name.length === 2 ? colors[0] : colors[1]
      let kw = name.length === 2 ? uw : uw - 8
      let sp = height - (time + duration - current) * tickHeight

      let x = name.length === 2 ? kbMap[name] * uw : kbMap[name] * uw + 4
      let y = sp
      let w = kw
      let h = tickHeight * duration
      let r = Math.min(w, h) / 2

      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)

      ctx.fillStyle = color
      ctx.strokeStyle = '#333'
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
        if (isStopped) {
          startTime = Date.now()
        }
        if (isPaused) {
          startTime += Date.now() - curTime
        }
        isPlaying = true
        isPaused = false
        isPausing = false
        isStopped = false
      })
      event.$on('pause', () => {
        if (isPlaying) {
          curTime = Date.now()
          isPlaying = false
          isPaused = true
          isPausing = false
          isStopped = false
        }
      })
      event.$on('stop', () => {
        startTime = null
        isPlaying = false
        isPaused = false
        isPausing = false
        isStopped = true
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

        let currentPlayTime
        if (isPlaying) {
          currentPlayTime = Date.now() - startTime
        }
        if (isPaused) {
          currentPlayTime = curTime - startTime
        }
        if (isStopped) {
          currentPlayTime = 0
        }
        currentPlayTime /= 1000

        render(ctx, this.midi, height, width, 200, currentPlayTime)

        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }
  }
</script>
