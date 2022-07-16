<template>
  <div style="padding: 10px">
    <h3>我的富文本</h3>
    <br />
    <RichText />
  </div>
</template>

<script>
import RichText from './RichText';

export default {
  name: 'richtext',

  components: { RichText },

  data() {
    return {
      options: {
        trigger: '@',
        values: [
          { key: 'Collin Henderson', value: 'syropian' },
          { key: 'Sarah Drasner', value: 'sarah_edo' },
          { key: 'Evan You', value: 'youyuxi' },
          { key: 'Adam Wathan', value: 'adamwathan' },
        ],
        positionMenu: true,
        menuContainer: document.querySelector('.menu-container'),
      },
    };
  },

  computed: {},

  watch: {},

  mounted() {
    this.options.menuContainer = this.$refs.menuContainer;
  },
  methods: {},
};
</script>

<style lang="scss" scoped></style>
