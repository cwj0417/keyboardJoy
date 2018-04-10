<template>
  <div style='height: 400px;'></div>
</template>
<script type='text/ecmascript-6'>
  const getCanvasSize = (el) => {
    return [el.clientWidth, el.clientHeight]
  }
  const clear = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)
    ctx.beginPath()
  }

  const render = ctx => {
    ctx.closePath()
    ctx.fill()
  }

  export default {
    props: ['midi'],
    mounted () {
      let [width, height] = getCanvasSize(this.$el)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      this.$el.appendChild(canvas)
      const ctx = canvas.getContext('2d')

      let [a, b] = [0, 0]

      const loop = () => {
        clear(ctx, width, height)
        ctx.rect(a++, b++, 50, 50)
        render(ctx)
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }
  }
</script>
