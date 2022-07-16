<template>
  <div class="app-container">
    实例1

    <SubComp />
  </div>
</template>

<script>
import SubComp from './eg1/subcomp.vue';
export default {
  name: 'Eg1',

  mixins: [],

  components: { SubComp },

  props: {},

  data() {
    return {};
  },

  computed: {},

  watch: {},

  created() {},

  // 捕获来自子组件的错误
  errorCaptured(err, vm, info) {},

  methods: {},
};
</script>

<style lang="scss" scoped></style>
