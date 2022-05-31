<template>
  <div class="memory-comp">
    <el-tag>内存</el-tag>
  </div>
</template>

<script>
export default {
  name: 'MemoryComp',

  mixins: [],

  components: {},

  props: {},

  data() {
    return {};
  },

  computed: {},

  watch: {},

  created() {},

  methods: {
    async run() {
      // const result = await performance.measureUserAgentSpecificMemory();
      // console.log(result);
    },
  },

  mounted() {
    this.run();
  },
};
</script>

<style lang="scss" scoped>
.memory-comp {
  float: left;
  display: inline-block;
  font-size: 14px;
  line-height: 50px;
  margin-left: 8px;
}
</style>
