<template>
  <div class='key' :class='config.name.push ? "black" : "white"'  :style='{left: config.pos * 1.92308 + "%"}'>
    <div class="fill" :class='{active}'></div>
  </div>
</template>
<script type='text/ecmascript-6'>
  // key width was based on 100 / 52 %
  import event from '../eventBus'

  export default {
    data () {
      return {
        active: false
      }
    },
    props: ['config'],
    mounted () {
      const listen = (name) => {
        event.$on(`attackRelease-${name}`, duration => {
          this.active = true
          setTimeout(() => {
            this.active = false
          }, duration * 1000)
        })
      }
      if (!this.config.name.push) {
        listen(this.config.name)
      } else {
        this.config.name.forEach(name => listen(name))
      }
    }
  }
</script>
