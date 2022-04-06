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
      <el-tag>缩放比：{{ getPrevewImgAndMinimapImgRatio }}</el-tag>

      <div ref="minimapRef" class="minimap">
        <div
          v-show="showMinimapSelectRect"
          ref="selectRectRef"
          class="select-rect"
          :style="genMinimapSelectRectRenderStyle"
          @mousedown.stop="handleMinimapSelectRectMousedown"></div>
        <img
          :src="imgurl"
          class="minimap-img"
          :style="genMinimapImgRenderStyle"
          @click.stop="handleMinimapImgClick" />
      </div>
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

  data() {
    return {
      // imgurl: require('./larger-height.png'),
      // imgurl: require('./larger-width.png'),
      imgurl: require('./width-height-fit.png'),
      // imgurl: 'https://picsum.photos/seed/picsum/2200/100',

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
      // 图片移动前初始位置
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

      // 小地图
      // 小地图容器size
      miniMapDomSize: {
        miniMapDomWidth: 0,
        miniMapDomHeight: 0,
      },
      // 小地图图片渲染size
      minimapImgRenderSize: {
        minimapImgRenderWidth: 0,
        minimapImgRenderHeight: 0,
        minimapImgRenderTop: 0,
        minimapImgRenderLeft: 0,
      },
      // 小地图画框渲染size
      minimapSelectRectRenderSize: {
        minimapSelectRectRenderWidth: 0,
        minimapSelectRectRenderHeight: 0,
        minimapSelectRectRenderTop: 0,
        minimapSelectRectRenderLeft: 0,
      },
      // mousedown目标
      mousedownTarget: '',
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
    genMinimapImgRenderStyle() {
      const {
        minimapImgRenderWidth,
        minimapImgRenderHeight,
        minimapImgRenderTop,
        minimapImgRenderLeft,
      } = this.minimapImgRenderSize;

      return {
        width: minimapImgRenderWidth + 'px',
        height: minimapImgRenderHeight + 'px',
        left: minimapImgRenderLeft + 'px',
        top: minimapImgRenderTop + 'px',
      };
    },
    genMinimapSelectRectRenderStyle() {
      const {
        minimapSelectRectRenderWidth,
        minimapSelectRectRenderHeight,
        minimapSelectRectRenderTop,
        minimapSelectRectRenderLeft,
      } = this.minimapSelectRectRenderSize;

      return {
        width: minimapSelectRectRenderWidth + 'px',
        height: minimapSelectRectRenderHeight + 'px',
        left: minimapSelectRectRenderLeft + 'px',
        top: minimapSelectRectRenderTop + 'px',
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
    // 是否展示小地图画框
    showMinimapSelectRect() {
      const { imgRenderLeft, imgRenderTop } = this.imgRenderSize;
      const { max: maxTop, min: minTop } = this.genMoveImgTopMaxMin;
      const { max: maxLeft, min: minLeft } = this.genMoveImgLeftMaxMin;
      // 允许误差0.01
      return (
        maxLeft - imgRenderLeft > 0.01 ||
        imgRenderLeft - minLeft > 0.01 ||
        maxTop - imgRenderTop > 0.01 ||
        imgRenderTop - minTop > 0.01
      );
    },

    // 是否可以移动图片
    getCanMoveImg() {
      return this.genCanMoveImgTop || this.genCanMoveImgLeft;
    },

    // 渲染图片和小地图图片的缩放比
    getPrevewImgAndMinimapImgRatio() {
      return (
        this.imgRenderSize.imgRenderWidth /
        this.minimapImgRenderSize.minimapImgRenderWidth
      );
    },
  },

  filters: {
    percent(v) {
      return Math.floor(v * 100) + '%';
    },
  },

  methods: {
    loadImg() {
      return new Promise((resolve, reject) => {
        let img = new Image();
        img.src = this.imgurl;
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          resolve(img);
        };
      });
    },

    /**
     * 自适应填充
     * 1. 找出容器的宽度和高度 与 对应的图片原始宽度和图片原始高度 的比值，哪个小哪个就是填充百分比
     * 2. （用图片宽度和高度的1%值x填充的百分比x100）就得到图片渲染尺寸
     * 3. 根据渲染尺寸调整图片的left、top值，使其水平垂直居中
     *    a. （容器宽度-图片渲染宽度）/2 = left
     *    b. （容器高度-图片渲染高度）/2 = top
     */
    resize2Adaptive() {
      const { imgOriginWidth, imgOriginHeight } = this.imgOriginSize;

      const { imgPreviewDomWidth, imgPreviewDomHeight } =
        this.imgPreviewDomSize;

      const widthRatio = imgPreviewDomWidth / imgOriginWidth;
      const heightRatio = imgPreviewDomHeight / imgOriginHeight;

      const currentPercent = Math.min(widthRatio, heightRatio);

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
      const imgRenderLeft = this.calcCenterPosition(
        this.imgPreviewDomSize.imgPreviewDomWidth,
        imgRenderWidth
      );
      const imgRenderTop = this.calcCenterPosition(
        this.imgPreviewDomSize.imgPreviewDomHeight,
        imgRenderHeight
      );

      this.imgRenderSize = {
        imgRenderWidth,
        imgRenderHeight,
        imgRenderLeft,
        imgRenderTop,
      };

      this.rerenderMinimapSelectRect();
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

      this.rerenderImg();

      this.rerenderMinimapSelectRect();
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

      this.rerenderImg();

      this.rerenderMinimapSelectRect();
    },

    /**
     * 重新渲染图片
     */
    rerenderImg() {
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

        const { max: maxTop, min: minTop } = this.genMoveImgTopMaxMin;
        const { max: maxLeft, min: minLeft } = this.genMoveImgLeftMaxMin;
        // 是否到上边界
        if (newRenderTop >= maxTop) {
          newRenderTop = maxTop;
        }
        // 是否到右边界
        if (newRenderLeft <= minLeft) {
          newRenderLeft = minLeft;
        }
        // 是否到下边界
        if (newRenderTop <= minTop) {
          newRenderTop = minTop;
        }
        // 是否到左边界
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

      this.imgRenderSize.imgRenderLeft = newRenderLeft;
      this.imgRenderSize.imgRenderTop = newRenderTop;
    },

    /**
     * 重新渲染小地图画框
     * 当渲染图片缩放、移动位置时：
     *  	width = 图片预览容器宽度/缩放比
     *    height= 图片预览容器高度/缩放比
     *    left = 小地图图片的渲染left  -（图片区域left / 缩放比）
     *    top = 小地图图片的渲染left -（图片区域top / 缩放比）
     */
    rerenderMinimapSelectRect() {
      const {
        imgRenderSize: { imgRenderTop, imgRenderLeft },
        getPrevewImgAndMinimapImgRatio,
        imgPreviewDomSize: { imgPreviewDomWidth, imgPreviewDomHeight },
        minimapImgRenderSize: { minimapImgRenderTop, minimapImgRenderLeft },
      } = this;

      this.minimapSelectRectRenderSize = {
        minimapSelectRectRenderWidth:
          imgPreviewDomWidth / getPrevewImgAndMinimapImgRatio,
        minimapSelectRectRenderHeight:
          imgPreviewDomHeight / getPrevewImgAndMinimapImgRatio,
        minimapSelectRectRenderTop:
          minimapImgRenderTop - imgRenderTop / getPrevewImgAndMinimapImgRatio,
        minimapSelectRectRenderLeft:
          minimapImgRenderLeft - imgRenderLeft / getPrevewImgAndMinimapImgRatio,
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
    /**
     * 计算元素某方向在容器内的中心点坐标
     */
    calcCenterPosition(containerSize, targetSize) {
      return (containerSize - targetSize) / 2;
    },

    // 按下图片渲染位置
    handleImgRenderMousedown(e) {
      this.mousedownTarget = 'imgRender';
      this.handleDocumentMousedown(e);
    },

    // 按下小地图红框渲染位置
    handleMinimapSelectRectMousedown(e) {
      this.mousedownTarget = 'minimapSelectRect';
      this.handleDocumentMousedown(e);
    },

    // 统一处理按下事件
    handleDocumentMousedown(e) {
      if (!this.getCanMoveImg) return;

      this.mousedownHandlerMixin(e);
      // 记录移动图片前的初始值
      this.imgMousemoveStartOriginPos = {
        imgMousemoveStartOriginTop: this.imgRenderSize.imgRenderTop,
        imgMousemoveStartOriginLeft: this.imgRenderSize.imgRenderLeft,
      };

      document.addEventListener('mousemove', this.handleDocumentMousemove);
      document.addEventListener('mouseup', this.handleDocumentMouseup);
    },

    // 点击小地图图片未被红框覆盖的空白区域
    handleMinimapImgClick(e) {
      if (!this.getCanMoveImg || !this.showMinimapSelectRect) return;

      this.resetMouseActionStatusMixin();
      this.mousedownTarget = 'minimapSelectRect';
      // 记录移动图片前的初始值
      this.imgMousemoveStartOriginPos = {
        imgMousemoveStartOriginTop: this.imgRenderSize.imgRenderTop,
        imgMousemoveStartOriginLeft: this.imgRenderSize.imgRenderLeft,
      };

      const { left: originLeft, top: originTop } =
        this.$refs.selectRectRef.getBoundingClientRect();
      const { minimapSelectRectRenderWidth, minimapSelectRectRenderHeight } =
        this.minimapSelectRectRenderSize;

      this.mouseStartXMixin = originLeft + minimapSelectRectRenderWidth / 2;
      this.mouseStartYMixin = originTop + minimapSelectRectRenderHeight / 2;

      this.$nextTick(() => {
        this.handleDocumentMousemove(e);
      });
    },

    /**
     * 图片拖动
     * left/top = 图片初始位置 + 拖动偏移量 * 比率
     * 计算边界
     */
    handleDocumentMousemove(e) {
      this.mousemoveHandlerMixin(e);

      const { deltaYMixin, deltaXMixin } = this;

      // 如果鼠标按下的是图片渲染区域，则比率是1
      // 如果鼠标按下的是小地图区域选择框，则是负的缩放比
      const ratio =
        this.mousedownTarget === 'imgRender'
          ? 1
          : -this.getPrevewImgAndMinimapImgRatio;

      // 计算最终left
      if (this.genCanMoveImgLeft) {
        let _left =
          this.imgMousemoveStartOriginPos.imgMousemoveStartOriginLeft +
          deltaXMixin * ratio;
        const { max: maxLeft, min: minLeft } = this.genMoveImgLeftMaxMin;
        _left = _left > maxLeft ? maxLeft : _left < minLeft ? minLeft : _left;

        this.imgRenderSize.imgRenderLeft = _left;
      }

      // 计算最终top
      if (this.genCanMoveImgTop) {
        let _top =
          this.imgMousemoveStartOriginPos.imgMousemoveStartOriginTop +
          deltaYMixin * ratio;
        const { max: maxTop, min: minTop } = this.genMoveImgTopMaxMin;
        _top = _top > maxTop ? maxTop : _top < minTop ? minTop : _top;

        this.imgRenderSize.imgRenderTop = _top;
      }

      this.rerenderMinimapSelectRect();
    },

    handleDocumentMouseup() {
      this.resetMouseActionStatusMixin();
      document.removeEventListener('mousemove', this.handleDocumentMousemove);
      document.removeEventListener('mouseup', this.handleDocumentMouseup);
    },

    // 鼠标滚轮事件处理
    // BUGFIX: 解决双指缩放页面会整体放大
    handleMouseWheel(e) {
      e.preventDefault();
      e.stopPropagation();

      const finalData = e.wheelDelta || -e.deltaY;

      // 向上滚缩小
      if (finalData < 0) {
        this.zoomOut(0.01);
      } else {
        this.zoomIn(0.01);
      }
    },

    // 初始化小地图，将图片填充至自适应大小
    initMiniMap() {
      const $minimapDom = this.$refs.minimapRef;
      const { width: miniMapDomWidth, height: miniMapDomHeight } =
        $minimapDom.getBoundingClientRect();

      const { imgOriginWidth, imgOriginHeight } = this.imgOriginSize;

      const widthRatio = miniMapDomWidth / imgOriginWidth;
      const heightRatio = miniMapDomHeight / imgOriginHeight;
      const currentPercent = Math.min(widthRatio, heightRatio);

      const minimapImgRenderWidth = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentWidth,
        currentPercent
      );
      const minimapImgRenderHeight = this.calcRenderSize(
        this.imgOriginOnePercentSize.imgOriginOnePercentHeight,
        currentPercent
      );

      const minimapImgRenderLeft = this.calcCenterPosition(
        miniMapDomWidth,
        minimapImgRenderWidth
      );
      const minimapImgRenderTop = this.calcCenterPosition(
        miniMapDomHeight,
        minimapImgRenderHeight
      );

      this.miniMapDomSize = {
        miniMapDomWidth,
        miniMapDomHeight,
      };

      this.minimapImgRenderSize = {
        minimapImgRenderWidth,
        minimapImgRenderHeight,
        minimapImgRenderLeft,
        minimapImgRenderTop,
      };
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

        this.initMiniMap();
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
  }

  .minimap {
    position: relative;
    width: 300px;
    height: 200px;
    background-color: #0f0f14;
    overflow: hidden;
    .select-rect {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: block;
      z-index: 2;
      border: 2px solid red;
    }

    .minimap-img {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: block;
      user-select: none;
      z-index: 1;
    }
  }
}
</style>
