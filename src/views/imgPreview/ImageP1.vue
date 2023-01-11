<template>
  <div class="preview-container">
    <div ref="imgPreviewRef" class="img-preview">
      <img :src="imgurl" class="img" :style="genStyle" />
      <div class="ball" :style="genBallStyle"></div>
    </div>

    <div class="control">
      <span>当前比率：{{ previewOpts.currentScale }}</span>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <el-button @click="zoomIn(0.5)">放大(+50%)</el-button>
      <el-button @click="zoomOut(0.5)">缩小(-50%)</el-button>
      <el-button @click="resize2Adaptive">自适应填充</el-button>
    </div>
  </div>
</template>

<script>
import MouseMixin from '@/mixins/mouse.mixin.js';

export default {
  name: 'ImgP1',

  mixins: [MouseMixin],

  data() {
    return {
      imgurl: require('./width-height-fit.png'),
      previewOpts: {
        pos: {
          x: 0,
          y: 0,
        },
        currentScale: 1,
        transformOrigin: {
          x: 0,
          y: 0,
        },
      },
      tttt: {
        x: 100,
        y: 100,
      },
    };
  },

  computed: {
    genStyle() {
      const translate = `translate3D(${this.previewOpts.pos.x}px, ${this.previewOpts.pos.y}px, 0px) scale(${this.previewOpts.currentScale})`;
      const transformOrigin = `${this.previewOpts.transformOrigin.x}px ${this.previewOpts.transformOrigin.y}px`;
      return {
        transform: translate,
        'transform-origin': transformOrigin,
        // margin: '0px',
      };
    },
    genBallStyle() {
      return {
        top: this.tttt.y + 'px',
        left: this.tttt.x + 'px',
      };
    },
  },

  methods: {
    zoomIn(s) {
      const oldScale = this.previewOpts.currentScale;
      this.previewOpts.currentScale += s;
      this.previewOpts.pos.x -=
        this.tttt.x * (this.previewOpts.currentScale - oldScale);
      this.previewOpts.pos.y -=
        this.tttt.y * (this.previewOpts.currentScale - oldScale);
    },
    zoomOut(s) {
      const oldScale = this.previewOpts.currentScale;
      this.previewOpts.currentScale -= s;
      this.previewOpts.pos.x -=
        this.tttt.x * (this.previewOpts.currentScale - oldScale);
      this.previewOpts.pos.y -=
        this.tttt.y * (this.previewOpts.currentScale - oldScale);
    },
    resize2Adaptive() {},
  },

  mounted() {},
};
</script>

<style lang="scss" scoped>
.preview-container {
  padding: 20px;

  .img-preview {
    position: relative;
    width: 900px;
    height: 600px;
    background-color: #0f0f14;
    overflow: hidden;

    .cover-div {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 2;
    }

    .img {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: block;
      user-select: none;
      z-index: 1;
    }

    .ball {
      position: absolute;
      top: 0;
      left: 0;
      width: 10px;
      height: 10px;
      transform: translate3d(-50%, -50%, 0);
      border-radius: 50%;
      background: red;
      z-index: 100;
    }
  }
}
</style>
