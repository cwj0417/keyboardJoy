<template>
    <div class='kb' :class='{active: playing}'>
      <p>{{keyName}}</p>
      <p>for</p>
      <p>{{keymap[keyName]}}</p>
    </div>
</template>
<script>
    import keymap from '../config/keymap'
    export default {
        props: ['keyName', 'playing'],
        data () {
            return {
                keymap
            }
        }
    }
</script>
<style scoped>
    .kb {
        width: 50px;
        height: 200px;
        background: #ccc;
        margin: 2px;
    }
    .active {
        background: #999;
    }
</style>
