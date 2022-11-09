<template>
  <div class="preview-container">
    <div class="doc-preview-wrapper">
      <div class="sidebar"></div>
      <div
        ref="docPreviewRef"
        class="doc-preview"
        @scroll="handleDocPrevewScroll">
        <!-- <img :src="imgUrls[0]" :style="genDocImgRenderStyle" /> -->
        <div
          v-for="(item, index) of imgUrls"
          :key="index"
          :style="[genDocImgRenderStyle]"
          class="doc-image-container">
          <img v-lazy="item" />
        </div>
      </div>
    </div>

    <div class="control">
      <el-tag type="danger" style="margin-right: 20px">
        当前比率：{{ currentPercent | percent }}
      </el-tag>
      当前页码：
      <el-input-number
        v-model="previewPageIndex"
        :step="1"
        :min="1"
        :max="imgUrls.length"
        step-strictly
        style="margin-right: 20px"
        :disabled="resizeScrollLocked"></el-input-number>
      <el-button @click="zoomIn(0.1)">放大(+50%)</el-button>
      <el-button @click="zoomOut(0.1)">缩小(-50%)</el-button>
      <el-button @click="resize2Adaptive">自适应填充</el-button>
    </div>
  </div>
</template>

<script>
import { loadImgByUrl } from '@/utils/file.js';
// 最小比率
const MinPercent = 0.01;
// 最大比率
const MaxPercent = 4;
// 每张图片间距
const Gap = 20;

export default {
  name: 'DocPreview',

  components: {},

  props: {},

  data() {
    return {
      imgUrls: [
        'https://picsum.photos/id/1/746/1056',
        'https://picsum.photos/id/2/746/1056',
        'https://picsum.photos/id/3/746/1056',
        'https://picsum.photos/id/4/746/1056',
        'https://picsum.photos/id/5/746/1056',
        'https://picsum.photos/id/6/746/1056',
        'https://picsum.photos/id/7/746/1056',
        'https://picsum.photos/id/8/746/1056',
      ],
      // 当前缩放比率
      currentPercent: MinPercent,
      // 每个文档图片原始size
      docImgOriginSize: {
        width: 0,
        height: 0,
      },
      // 文档图片原始1%size
      docImgOriginOnePercentSize: {
        width: 0,
        height: 0,
      },
      // 文档图片实际渲染size
      docImgRenderSize: {
        width: 0,
        height: 0,
      },
      // 文档图片预览容器size
      docImgPreviewDomSize: {
        width: 0,
        height: 0,
      },
      // 文档图片预览滚动条位置
      docImgPreviewScrollPos: {
        scrollLeft: 0,
        scrollTop: 0,
      },
      // 缩放、滚动锁定
      resizeScrollLocked: false,
      // 当前预览的页码
      previewPageIndex: 1,
    };
  },

  computed: {
    genDocImgRenderStyle() {
      const { width, height } = this.docImgRenderSize;

      return {
        width: width + 'px',
        height: height + 'px',
        // left: imgRenderLeft + 'px',
        // top: imgRenderTop + 'px',
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
    // 放大
    zoomIn(addPercent) {
      let addedPercent = this.currentPercent + addPercent;
      if (addedPercent >= MaxPercent) {
        addedPercent = MaxPercent;
      }
      // 相等不渲染
      if (addedPercent === this.currentPercent) return;

      this.currentPercent = addedPercent;

      this.rerenderDocImg();
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

      this.rerenderDocImg();
    },

    // 滚动时
    handleDocPrevewScroll(e) {
      const { scrollTop, scrollLeft } = e.target;
      this.docImgPreviewScrollPos = { scrollTop, scrollLeft };
      this.handleDocImgPreviewScrollPosEffect(false);
    },

    /**
     * 当滚动位置发生变化
     * 1. 更新文档页码
     */
    handleDocImgPreviewScrollPosEffect(isSetScrollPos = true) {
      this.$nextTick(() => {
        const $docPreviewRef = this.$refs.docPreviewRef;
        const { scrollTop, scrollLeft } = this.docImgPreviewScrollPos;
        if (isSetScrollPos) {
          $docPreviewRef.scrollTop = scrollTop;
          $docPreviewRef.scrollLeft = scrollLeft;
        }

        const previewPageIndex =
          Math.floor(scrollTop / (this.docImgRenderSize.height + Gap / 2)) + 1;
        this.previewPageIndex = previewPageIndex;
      });
    },

    // 重新渲染文档图片
    rerenderDocImg() {
      const { width: oldDocImgRenderWidth, height: oldDocImgRenderHeight } =
        this.docImgRenderSize;

      const { scrollLeft: oldScrollLeft, scrollTop: oldScrollTop } =
        this.docImgPreviewScrollPos;

      const { width: docImgPreviewDomWidth, height: docImgPreviewDomHeight } =
        this.docImgPreviewDomSize;

      // 计算最终宽度和高度，并赋值
      const newRenderWidth = this.calcRenderSize(
        this.docImgOriginOnePercentSize.width,
        this.currentPercent
      );
      const newRenderHeight = this.calcRenderSize(
        this.docImgOriginOnePercentSize.height,
        this.currentPercent
      );

      this.docImgRenderSize = {
        width: newRenderWidth,
        height: newRenderHeight,
      };

      let newRenderScrollLeft = 0;
      let newRenderScrollTop = 0;
      const oldRenderTotalHeight = this.calcTotalHeight(oldDocImgRenderHeight);
      const newRenderTotalHeight = this.calcTotalHeight(newRenderHeight);

      // 图片数量
      const imgNums = this.imgUrls.length || 0;

      // 宽度和或者高度大于可视区域时，计算位置
      if (
        newRenderWidth > docImgPreviewDomWidth ||
        newRenderTotalHeight > docImgPreviewDomHeight
      ) {
        newRenderScrollLeft = this.calcRenderPosition(
          oldScrollLeft,
          oldDocImgRenderWidth,
          newRenderWidth
        );

        newRenderScrollTop = this.calcRenderPosition(
          oldScrollTop,
          oldRenderTotalHeight,
          newRenderTotalHeight
        );

        const maxTop = Math.max(
          0,
          newRenderHeight * imgNums - docImgPreviewDomHeight
        );
        const minTop = 0;
        const maxLeft = Math.max(0, newRenderWidth - docImgPreviewDomWidth);
        const minLeft = 0;

        // 是否到上边界
        if (newRenderScrollTop < minTop) {
          newRenderScrollTop = minTop;
        }
        // 是否到右边界
        if (newRenderScrollLeft >= maxLeft) {
          newRenderScrollLeft = maxLeft;
        }
        // 是否到下边界
        if (newRenderScrollTop >= maxTop) {
          newRenderScrollTop = maxTop;
        }
        // 是否到左边界
        if (newRenderScrollLeft < minLeft) {
          newRenderScrollLeft = maxLeft;
        }
      } else {
        // this.
      }

      this.docImgPreviewScrollPos = {
        screenLeft: newRenderScrollLeft,
        scrollTop: newRenderScrollTop,
      };

      this.handleDocImgPreviewScrollPosEffect();
    },
    /**
     * 自适应填充
     * 1. 默认高度填充满
     * 2. （用图片宽度和高度的1%值x填充的百分比x100）就得到图片渲染尺寸
     * 3. 根据渲染尺寸调整图片的left、top值，使其水平垂直居中
     *    a. （容器宽度-图片渲染宽度）/2 = left
     *    b. （容器高度-图片渲染高度）/2 = top
     */
    resize2Adaptive() {
      const { height: docImgOriginHeight } = this.docImgOriginSize;
      const { height: docImgPreviewDomHeight } = this.docImgPreviewDomSize;

      const heightRatio = docImgPreviewDomHeight / docImgOriginHeight;

      const currentPercent = heightRatio;

      if (currentPercent === this.currentPercent) return;

      this.currentPercent = currentPercent;

      const docImgRenderWidth = this.calcRenderSize(
        this.docImgOriginOnePercentSize.width,
        this.currentPercent
      );
      const docImgRenderHeight = this.calcRenderSize(
        this.docImgOriginOnePercentSize.height,
        this.currentPercent
      );

      const newRenderScrollLeft = this.calcRenderPosition(
        this.docImgPreviewScrollPos.scrollLeft,
        this.docImgRenderSize.width,
        docImgRenderWidth
      );

      const newRenderScrollTop = this.calcRenderPosition(
        this.docImgPreviewScrollPos.scrollTop,
        this.calcTotalHeight(this.docImgRenderSize.height),
        this.calcTotalHeight(docImgRenderHeight)
      );

      this.docImgRenderSize = {
        width: docImgRenderWidth,
        height: docImgRenderHeight,
      };
      this.docImgPreviewScrollPos = {
        scrollLeft: newRenderScrollLeft,
        scrollTop: newRenderScrollTop,
      };

      this.handleDocImgPreviewScrollPosEffect(true);
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
     * 计算整体高度
     */
    calcTotalHeight(perHeight) {
      const imgNums = this.imgUrls.length;
      return perHeight * imgNums + (Gap * imgNums - 1);
    },
    /**
     * 整体放大或缩小时，需要计算滚动态位置
     */
    calcRenderPosition(oldPos, oldSize, newSize) {
      if (!oldPos || !oldSize || !newSize) return 0;
      return (newSize * oldPos) / oldSize;
    },

    async initilize() {
      try {
        const img = await loadImgByUrl(this.imgUrls[0]);
        this.docImgOriginSize = {
          width: img.width,
          height: img.height,
        };
        this.docImgOriginOnePercentSize = {
          width: img.width / 100,
          height: img.height / 100,
        };
        // 图片预览容器
        const $docPreviewRef = this.$refs.docPreviewRef;
        const { width, height } = $docPreviewRef.getBoundingClientRect();
        this.docImgPreviewDomSize = {
          width: width,
          height: height,
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

  .doc-preview-wrapper {
    display: flex;

    .sidebar {
      width: 120px;
      background: lightblue;
    }
  }

  .doc-preview {
    position: relative;
    width: 900px;
    height: 600px;
    overflow: auto;
    background: lightsteelblue;

    /* 当高度撑不开可视区域时，垂直居中 */
    &.center-active {
      display: flex;
      justify-content: center;
      flex-flow: column nowrap;
    }

    .doc-image-container {
      margin: 0 auto;
      > img {
        display: block;
        user-select: none;
        width: 100%;
        height: 100%;
      }

      & + .doc-image-container {
        margin-top: 20px;
      }
    }
  }

  .control {
    margin-top: 20px;
  }
}
</style>
