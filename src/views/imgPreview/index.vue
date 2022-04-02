<template>
  <div class="preview-container">
    <div ref="imgPreviewRef" class="img-preview" @mousewheel="handleMouseWheel">
      <div
        class="cover-div"
        :style="genImgRenderStyle"
        @mousedown="handleImgRenderMousedown"></div>
      <img :src="imgurl" class="img" :style="genImgRenderStyle" />
    </div>

    <div class="control">
      <span>当前比率：{{ currentPercent | percent }}</span>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <el-button @click="zoomIn(0.5)">放大(+50%)</el-button>
      <el-button @click="zoomOut(0.5)">缩小(-50%)</el-button>
      <el-button @click="resize2Adaptive">自适应填充</el-button>
    </div>
  </div>
</template>

<script>
import MouseMixin from '@/mixins/mouse.mixin.js';
// 最小比率
const MinPercent = 0.01;
// 最大比率
const MaxPercent = 4;

export default {
  name: 'ImgPreview',

  mixins: [MouseMixin],

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
      // 图片移动前原始位置
      imgMousemoveStartOriginPos: {
        imgMousemoveStartOriginTop: 0,
        imgMousemoveStartOriginLeft: 0,
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
    // 是否能够移动图片top位置
    genCanMoveImgTop() {
      const { imgRenderTop } = this.imgRenderSize;
      return (
        imgRenderTop <= this.genMoveImgTopMaxMin.max &&
        imgRenderTop >= this.genMoveImgTopMaxMin.min
      );
    },
    // 是否能够移动图片left位置
    genCanMoveImgLeft() {
      const { imgRenderLeft } = this.imgRenderSize;
      return (
        imgRenderLeft <= this.genMoveImgLeftMaxMin.max ||
        imgRenderLeft >= this.genMoveImgLeftMaxMin.min
      );
    },
    // 计算可移动top最大最小值
    genMoveImgTopMaxMin() {
      const { imgPreviewDomHeight } = this.imgPreviewDomSize;
      const { imgRenderHeight } = this.imgRenderSize;
      return {
        max: 0,
        min: imgPreviewDomHeight - imgRenderHeight,
      };
    },
    // 计算可移动left最大最小值
    genMoveImgLeftMaxMin() {
      const { imgPreviewDomWidth } = this.imgPreviewDomSize;
      const { imgRenderWidth } = this.imgRenderSize;
      return {
        max: 0,
        min: imgPreviewDomWidth - imgRenderWidth,
      };
    },

    // 是否可以移动图片
    getCanMoveImg() {
      return this.genCanMoveImgTop || this.genCanMoveImgLeft;
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

      this.rerenderImg(true);
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

      this.rerenderImg(false);
    },

    /**
     * 重新渲染图片
     * @param isZoomIn 是否放大
     */
    rerenderImg(isZoomIn = false) {
      const {
        imgRenderWidth: oldImgRenderWidth,
        imgRenderHeight: oldImgRenderHeight,
        imgRenderTop: oldImgRenderTop,
        imgRenderLeft: oldImgRenderLeft,
      } = this.imgRenderSize;

      const { imgPreviewDomWidth, imgPreviewDomHeight } =
        this.imgPreviewDomSize;

      // 计算最终宽度和高度，并赋值
      const newRenderWidth = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentWidth,
        this.currentPercent
      );
      const newRenderHeight = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentHeight,
        this.currentPercent
      );
      this.imgRenderSize.imgRenderWidth = newRenderWidth;
      this.imgRenderSize.imgRenderHeight = newRenderHeight;

      let newRenderLeft = 0;
      let newRenderTop = 0;
      // 如果宽度和高度都小于容器宽度和高度，则水平垂直居中
      if (
        newRenderWidth <= imgPreviewDomWidth &&
        newRenderHeight <= imgPreviewDomHeight
      ) {
        newRenderLeft = this.calcCenterPosition(
          imgPreviewDomWidth,
          newRenderWidth
        );
        newRenderTop = this.calcCenterPosition(
          imgPreviewDomHeight,
          newRenderHeight
        );
      } else {
        newRenderLeft = this.calcRenderPosition(
          oldImgRenderLeft,
          oldImgRenderWidth,
          newRenderWidth
        );

        newRenderTop = this.calcRenderPosition(
          oldImgRenderTop,
          oldImgRenderHeight,
          newRenderHeight
        );

        if (!isZoomIn) {
          const { max: maxTop, min: minTop } = this.genMoveImgTopMaxMin;
          const { max: maxLeft, min: minLeft } = this.genMoveImgLeftMaxMin;
          // 缩小前是否到上边界
          if (newRenderTop >= maxTop) {
            newRenderTop = maxTop;
          }
          // 缩小前是否到右边界
          if (newRenderLeft <= minLeft) {
            newRenderLeft = minLeft;
          }
          // 缩小前是否到下边界
          if (newRenderTop <= minTop) {
            newRenderTop = minTop;
          }
          // 缩小前是否到左边界
          if (newRenderLeft >= maxLeft) {
            newRenderLeft = maxLeft;
          }
          // 如果宽度小于容器宽度，则水平居中
          if (newRenderWidth <= imgPreviewDomWidth) {
            newRenderLeft = this.calcCenterPosition(
              imgPreviewDomWidth,
              newRenderWidth
            );
          }
          // 如果高度小于容器高度，则垂直居中
          if (newRenderHeight <= imgPreviewDomHeight) {
            newRenderTop = this.calcCenterPosition(
              imgPreviewDomHeight,
              newRenderHeight
            );
          }
        }
      }

      this.imgRenderSize.imgRenderLeft = newRenderLeft;
      this.imgRenderSize.imgRenderTop = newRenderTop;
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
    /**
     * 计算元素某方向在容器内的中心点坐标
     */
    calcCenterPosition(containerSize, targetSize) {
      return (containerSize - targetSize) / 2;
    },

    handleImgRenderMousedown(e) {
      if (!this.getCanMoveImg) return;

      this.mousedownHandlerMixin(e);
      this.imgMousemoveStartOriginPos = {
        imgMousemoveStartOriginTop: this.imgRenderSize.imgRenderTop,
        imgMousemoveStartOriginLeft: this.imgRenderSize.imgRenderLeft,
      };
      document.addEventListener('mousemove', this.handleDocumentMousemove);
      document.addEventListener('mouseup', this.handleDocumentMouseup);
    },

    handleDocumentMousemove(e) {
      this.mousemoveHandlerMixin(e);

      const { deltaYMixin, deltaXMixin } = this;
      if (this.genCanMoveImgLeft) {
        let _left =
          this.imgMousemoveStartOriginPos.imgMousemoveStartOriginLeft +
          deltaXMixin;

        const { max, min } = this.genMoveImgLeftMaxMin;
        // 判断移动边界
        _left = _left > max ? max : _left < min ? min : _left;

        this.imgRenderSize.imgRenderLeft = _left;
      }

      if (this.genCanMoveImgTop) {
        let _top =
          this.imgMousemoveStartOriginPos.imgMousemoveStartOriginTop +
          deltaYMixin;

        const { max, min } = this.genMoveImgTopMaxMin;
        // 判断移动边界
        _top = _top > max ? max : _top < min ? min : _top;

        this.imgRenderSize.imgRenderTop = _top;
      }
    },

    handleDocumentMouseup() {
      document.removeEventListener('mousemove', this.handleDocumentMousemove);
      document.removeEventListener('mouseup', this.handleDocumentMouseup);
    },

    // 鼠标滚轮事件处理
    // FIXME: 双指缩放页面会整体放大，有问题
    handleMouseWheel(e) {
      const finalData = e.wheelDelta || -e.deltaY;
      // 向上滚放大
      if (finalData < 0) {
        this.zoomIn(0.01);
      } else {
        this.zoomOut(0.01);
      }
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
      position: absolute;
      background-size: 30px 30px;
      background-color: transparent;
      background-position: 0 0, 15px 15px;
      user-select: none;
      z-index: 1;
    }
  }
}
</style>
