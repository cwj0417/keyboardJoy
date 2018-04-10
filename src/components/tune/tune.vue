<template>
  <div>
    <div class="select"></div>
    <component :is='component' :midi='midi'></component>
  </div>
</template>
<script type='text/ecmascript-6'>
  import flow from './canvas_flow/flow.vue'
  export default {
    props: ['midi'],
    data () {
      return {
        component: 'flow'
      }
    },
    components: {flow}
  }
</script>
