<template>
  <el-card>
    <el-row>我是子组件</el-row>
    <el-row>{{ c }}</el-row>
    <el-button v-ft_error @click="handleSync"
      >点击事件执行同步函数报错</el-button
    >
    <el-button @click="handleAsync">点击事件执行handleAsync函数报错</el-button>

    <el-row>
      列表循环异常
      <ul>
        <li v-for="item of list" :key="item">
          {{ item.label.substring(0) }}
        </li>
      </ul>
    </el-row>
  </el-card>
</template>

<script>
export default {
  name: 'SubComp',

  mixins: [],

  components: {},

  props: {},

  data() {
    return {
      list: [{ label: 1 }, { label: '2' }],
      c: '',
    };
  },

  directives: {
    ft_error: {
      bind() {
        throw new Error();
      },
      inserted() {
        throw new Error();
      },
    },
  },

  computed: {
    abc() {
      return { a: 1 };
    },
  },

  watch: {
    list: {
      handler() {
        this.handleWatchListError();
      },
    },
  },

  created() {
    this.a();
  },

  beforeCreate() {
    // a();
  },

  mounted() {
    // console.log(this);
    // this.a();
    this.$nextTick(() => {
      this.handleAsync();
    });
    // this.handleAsync();
  },

  methods: {
    handleWatchListError() {
      throw 1;
    },
    handleNormal() {
      // console.log(a);
    },
    handleSync() {
      // this.ad();
      this.list = null;
    },
    handleAsync() {
      return Promise.reject(1);
    },
  },
};
</script>

<style lang="scss" scoped></style>
