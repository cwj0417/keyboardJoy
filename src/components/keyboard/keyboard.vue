<template>
  <div class='keyboard'>
    <item v-for='(item, index) of config' :key='index' :config='item' />
  </div>
</template>
<script type='text/ecmascript-6'>
  import config from './config'
  import item from './item.vue'
  export default {
    components: {item},
    data () {
      return {
        config
      }
    }
  }
  // key width was 100 / 52 %
</script>
<style>
  .keyboard {
    display: block;
    transform: translate(0, 0);
    height: 100px;
    width: 100%;
  }
  .key {
    position: absolute;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    width: 1.92308%;
    height: calc(100% - 2 * 2px);
    top: 0;
  }
  .black {
    z-index: 1;
    height: 50%;
  }
  .white {
    z-index: 0;
  }
  .key .fill {
    border: 2px solid #d7d7d7;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    transition: background-color 0.6s;
  }
  .key.white .fill {
    background-color: #e5e5e5;
  }
  .key.black .fill {
    background-color: #7f7f7f;
    width: calc(100% - 8px);
    left: 4px;
  }
  .key .fill.active {
    background-color: #fff;
    transition: background-color 0s;
  }
</style>
