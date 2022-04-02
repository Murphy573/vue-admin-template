<template>
  <div class="preview-container">
    <div ref="imgPreviewRef" class="img-preview">
      <img :src="imgurl" class="img" :style="genImgRenderStyle" />
    </div>

    <div class="control">
      <span>当前比率：{{ currentPercent | percent }}</span>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <el-button @click="zoomIn(0.1)">放大(+10%)</el-button>
      <el-button @click="zoomOut(0.1)">缩小(-10%)</el-button>
      <el-button @click="resize2Adaptive">自适应填充</el-button>
    </div>
  </div>
</template>

<script>
// 最小比率
const MinPercent = 0.01;
// 最大比率
const MaxPercent = 4;

export default {
  name: 'ImgPreview',

  mixins: [],

  components: {},

  props: {},

  data() {
    return {
      imgurl: require('./larger-height.png'),
      // imgurl: require('./larger-width.png'),
      // imgurl: require('./width-height-fit.png'),

      // 图片原始size
      imgOriginSize: {
        imgOriginWidth: 0,
        imgOriginHeight: 0,
      },
      // 图片实际渲染size
      imgRenderSize: {
        imgRenderWidth: 0,
        imgRenderHeight: 0,
        imgRenderTop: 0,
        imgRenderLeft: 0,
      },
      // 图片原始1%size
      imgOriginOnePercentSize: {
        imgOriginOnePercentWidth: 0,
        imgOriginOnePercentHeight: 0,
      },
      // 图片预览容器size
      imgPreviewDomSize: {
        imgPreviewDomWidth: 0,
        imgPreviewDomHeight: 0,
      },
      // 当前缩放比率
      currentPercent: MinPercent,
    };
  },

  computed: {
    genImgRenderStyle() {
      const { imgRenderWidth, imgRenderHeight, imgRenderLeft, imgRenderTop } =
        this.imgRenderSize;

      return {
        width: imgRenderWidth + 'px',
        height: imgRenderHeight + 'px',
        left: imgRenderLeft + 'px',
        top: imgRenderTop + 'px',
      };
    },
  },

  filters: {
    percent(v) {
      return Math.floor(v * 100) + '%';
    },
  },

  watch: {},

  created() {},

  methods: {
    loadImg() {
      return new Promise((resolve, reject) => {
        let img = new Image();
        img.src = this.imgurl;
        img.onload = function () {
          resolve(img);
        };
      });
    },

    /**
     * 自适应填充
     * 1. 找出图片原始宽度和图片原始高度的最大者和对应哪个属性（宽度 or 高度）
     * 2. 获取自适应填充百分比
     *	  a. 如果宽度大，则用容器宽度/图片原始宽度，则可以找出自适应填充百分比
     *	  b. 如果高度大，则用容器高度/图片原始高度，则可以找出自适应填充百分比
     * 3. （用图片宽度和高度的1%值x填充的百分比x100）就得到图片渲染尺寸
     * 4. 根据渲染尺寸调整图片的left、top值，使其水平垂直居中
     *    a. （容器宽度-图片渲染宽度）/2 = left
     *    b. （容器高度-图片渲染高度）/2 = top
     */
    resize2Adaptive() {
      const { imgOriginWidth, imgOriginHeight } = this.imgOriginSize;

      const { imgPreviewDomWidth, imgPreviewDomHeight } =
        this.imgPreviewDomSize;

      let currentPercent = 0;
      if (imgOriginWidth >= imgOriginHeight) {
        currentPercent = imgPreviewDomWidth / imgOriginWidth;
      } else {
        currentPercent = imgPreviewDomHeight / imgOriginHeight;
      }

      if (currentPercent === this.currentPercent) return;

      this.currentPercent = currentPercent;

      const imgRenderWidth = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentWidth,
        this.currentPercent
      );
      const imgRenderHeight = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentHeight,
        this.currentPercent
      );
      const imgRenderLeft =
        (this.imgPreviewDomSize.imgPreviewDomWidth - imgRenderWidth) / 2;
      const imgRenderTop =
        (this.imgPreviewDomSize.imgPreviewDomHeight - imgRenderHeight) / 2;

      this.imgRenderSize = {
        imgRenderWidth,
        imgRenderHeight,
        imgRenderLeft,
        imgRenderTop,
      };
    },

    // 放大
    zoomIn(addPercent) {
      let addedPercent = this.currentPercent + addPercent;
      if (addedPercent >= MaxPercent) {
        addedPercent = MaxPercent;
      }
      // 相等不渲染
      if (addedPercent === this.currentPercent) return;

      this.currentPercent = addedPercent;

      this.rendersss();
    },
    // 缩小
    zoomOut(minusPercent) {
      let minusedPercent = this.currentPercent - minusPercent;
      if (minusedPercent <= MinPercent) {
        minusedPercent = MinPercent;
      }
      // 相等不渲染
      if (minusedPercent === this.currentPercent) return;

      this.currentPercent = minusedPercent;

      this.rendersss();
    },

    rendersss() {
      const {
        imgRenderWidth: oldImgRenderWidth,
        imgRenderHeight: oldImgRenderHeight,
        imgRenderTop: oldImgRenderTop,
        imgRenderLeft: oldImgRenderLeft,
      } = this.imgRenderSize;

      const newRenderWidth = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentWidth,
        this.currentPercent
      );
      const newRenderHeight = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentHeight,
        this.currentPercent
      );

      this.imgRenderSize = {
        imgRenderWidth: newRenderWidth,
        imgRenderHeight: newRenderHeight,
        imgRenderLeft: this.calcRenderPosition(
          oldImgRenderLeft,
          oldImgRenderWidth,
          newRenderWidth
        ),
        imgRenderTop: this.calcRenderPosition(
          oldImgRenderTop,
          oldImgRenderHeight,
          newRenderHeight
        ),
      };
    },

    /**
     * 计算渲染大小size
     * 公式：新的位置 = 1%的大小 * 缩放比率 * 100
     * @param onePercentSize 1%所占的大小
     * @param percent 缩放比
     */
    calcRenderSize(onePercentSize, percent) {
      return onePercentSize * percent * 100;
    },

    /**
     * 计算渲染位置，保证缩放后能继续看到当前的图片区域
     * 公式：新的位置 = （旧的位置值）-（新的size - 旧的size）/ 2
     * 解释：除以2，图片放大缩小宽度或高度变化后，因为要继续看到当前图片区域，所以用差异值除以2进行调整
     * @param oldVal 旧的位置值
     * @param oldSize 旧的渲染大小（宽度or高度）
     * @param newSize 放大缩小后的渲染大小（宽度or高度）
     */
    calcRenderPosition(oldPos, oldSize, newSize) {
      return oldPos - (newSize - oldSize) / 2;
    },

    async initilize() {
      try {
        const img = await this.loadImg();
        this.imgOriginSize = {
          imgOriginWidth: img.width,
          imgOriginHeight: img.height,
        };
        this.imgOriginOnePercentSize = {
          imgOriginOnePercentWidth: this.imgOriginSize.imgOriginWidth / 100,
          imgOriginOnePercentHeight: this.imgOriginSize.imgOriginHeight / 100,
        };

        // 图片预览容器
        const $imgPreviewDom = this.$refs.imgPreviewRef;
        const { width, height } = $imgPreviewDom.getBoundingClientRect();
        this.imgPreviewDomSize = {
          imgPreviewDomWidth: width,
          imgPreviewDomHeight: height,
        };

        this.resize2Adaptive();
      } catch (error) {}
    },
  },

  mounted() {
    this.initilize();
  },
};
</script>

<style lang="scss" scoped>
.preview-container {
  padding: 20px;

  .img-preview {
    position: relative;
    width: 997.33px;
    height: 639px;
    background-color: #0f0f14;
    overflow: hidden;

    .img {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: block;
      position: absolute;
      background-size: 30px 30px;
      background-color: transparent;
      background-position: 0 0, 15px 15px;
    }
  }
}
</style>
