<template>
  <div class="muti-upload-container">
    <div v-for="(item, index) of imgList"
      :key="item"
      class="item">
      <SingleImage v-model="imgList[index]"
        :mutiple-index="index"
        v-bind="$attrs"
        nest-in-mutiple
        show-actions
        @on-mutiple-remove="handleRemove" />
    </div>
    <SingleImage v-bind="$attrs"
      nest-in-mutiple
      additional
      @upload-success="handleAdd"
      class="item" />
  </div>
</template>

<script>
import SingleImage from './single-upload.vue';

export default {
  name: 'MultipleImage',

  components: { SingleImage },

  props: {
    value: {
      type: Array,
      default: () => []
    },
    disabled: Boolean,
    width: {
      type: Number,
      default: 145
    },
    height: {
      type: Number,
      default: 145
    },
    accept: {
      type: String,
      default: '.jpg,.jpeg,.png,.gif'
    },
    // 图片限定大小：单位M
    limit: {
      type: Number,
      default: 20
    },
    // 最大数量
    maxCount: {
      type: Number,
      default: 99
    },
    openCompress: {
      type: Boolean,
      default: false
    },
    compressRatio: {
      type: Number,
      default: 0.3,
      validate (v) {
        return v > 0 && v < 1;
      }
    }
  },

  data () {
    return {
    };
  },

  computed: {
    imgList: {
      set (v) {
        this.$emit('input', v);
      },
      get () {
        return this.value;
      }
    }
  },

  methods: {
    uploadExceed () {
      this.$message({
        type: 'error',
        message: `上传文件个数超出限制!最多上传${this.maxCount}张图片!`
      });
    },
    handleRemove (index) {
      this.imgList.splice(index, 1);
    },
    handleAdd (url) {
      if (this.imgList.length >= this.maxCount) {
        this.uploadExceed();
        return;
      }
      this.imgList.push(url);
    }
  }
};
</script>

<style lang="scss" scoped>
.muti-upload-container {
  display: flex;
  flex-flow: row wrap;

  .item {
    margin-right: 4px;
    margin-top: 4px;
  }
}
</style>
