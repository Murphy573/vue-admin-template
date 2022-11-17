<template>
  <div class="preview-container">
    <div class="doc-preview-wrapper">
      <div ref="siderbarRef" class="sidebar">
        <img
          v-for="(item, index) of imgUrls"
          :key="index"
          v-lazy="item"
          :class="{ active: index === previewPageIndex - 1 }" />
      </div>
      <div
        ref="docPreviewRef"
        class="doc-preview"
        :class="{ 'sidebar-expand': sidebarExpand }"
        @scroll="handleDocPrevewScroll"
        @mousewheel="handleMouseWheel">
        <div
          v-for="(item, index) of imgUrls"
          :key="index"
          :style="[genDocImgRenderStyle]"
          class="doc-image-container">
          <img v-lazy="item" />
          <div>加载中。。。</div>
        </div>

        <div class="anno-container" :style="genAnnoStyle"></div>
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
        :disabled="resizeScrollLocked"
        @change="handleTargetPageIndexScrollIntoView"></el-input-number>
      <el-button @click="zoomIn(0.1)">放大(+50%)</el-button>
      <el-button @click="zoomOut(0.1)">缩小(-50%)</el-button>
      <el-button @click="resize2Adaptive">自适应填充</el-button>
      <el-button @click="toggleSidebarExpand">
        侧边栏{{ sidebarExpand ? '收起' : '展开' }}
      </el-button>
      <el-button @click="toggleAnnoActive">
        批注{{ this.annoOptions.active ? '关闭' : '激活' }}
      </el-button>
    </div>
  </div>
</template>

<script>
import { loadImgByUrl } from '@/utils/file.js';
// 最小比率
const MinPercent = 0.5;
// 最大比率
const MaxPercent = 2;
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
        // 懒加载设置初始高度
        height: 400,
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
      // 侧边栏展开
      sidebarExpand: false,
      // 批注选项
      annoOptions: {
        active: false,
        top: 0,
        left: 0,
      },
    };
  },

  computed: {
    genDocImgRenderStyle() {
      const { width, height } = this.docImgRenderSize;

      return {
        width: width + 'px',
        height: height + 'px',
      };
    },
    genAnnoStyle() {
      const { top, left, active } = this.annoOptions;
      const { width, height } = this.docImgRenderSize;

      return {
        width: width + 'px',
        height: height + 'px',
        top: top + 'px',
        left: left + 'px',
        display: active ? 'block' : 'none',
      };
    },
    // 图片数量
    getImgNums() {
      return this.imgUrls?.length || 0;
    },
  },

  filters: {
    percent(v) {
      return Math.floor(v * 100) + '%';
    },
  },

  methods: {
    toggleSidebarExpand() {
      this.sidebarExpand = !this.sidebarExpand;
      this.$nextTick(() => {
        // 图片预览容器
        const $docPreviewRef = this.$refs.docPreviewRef;
        this.docImgPreviewDomSize.width =
          $docPreviewRef?.getBoundingClientRect?.()?.width ||
          this.docImgPreviewDomSize.width;

        const maxLeft = Math.max(
          0,
          this.docImgRenderSize.width - this.docImgPreviewDomSize.width
        );

        this.docImgPreviewScrollPos = {
          ...this.docImgPreviewScrollPos,
          // 水平居中
          scrollLeft: maxLeft / 2,
        };

        this.handleDocImgPreviewScrollPosEffect();
      });
    },
    toggleAnnoActive() {
      this.annoOptions.active = !this.annoOptions.active;
      if (this.annoOptions.active) {
        const { width: renderWidth, height: renderHeight } =
          this.docImgRenderSize;
        const $docPreviewRef = this.$refs.docPreviewRef;

        this.annoOptions.top =
          (renderHeight + Gap) * (this.previewPageIndex - 1);
        // 出现滚动条时，需使用clientWidth
        this.annoOptions.left = Math.max(
          ($docPreviewRef.clientWidth - renderWidth) / 2,
          0
        );
      }
    },
    // 将目标图片页码滚动到可视区域内: 顶部与可视区域顶部对齐
    handleTargetPageIndexScrollIntoView(pageIndex = 1) {
      if (pageIndex < 1 || pageIndex > this.getImgNums) return;

      // 图片预览容器
      const $docPreviewRef = this.$refs.docPreviewRef;

      const { height: domImgRenderHeight } = this.docImgRenderSize;
      const { height: docImgPreviewDomHeight } = this.docImgPreviewDomSize;

      const maxTop = Math.max(
        0,
        this.calcTotalHeight(domImgRenderHeight) - docImgPreviewDomHeight
      );
      const minTop = 0;

      const items = $docPreviewRef.querySelectorAll('.doc-image-container');
      if (!items.length) return;

      let newRenderScrollTop =
        Math.max(pageIndex - 1, 0) * domImgRenderHeight +
        Math.max(pageIndex - 1, 0) * Gap;

      // 是否到上下边界
      newRenderScrollTop =
        newRenderScrollTop >= maxTop
          ? maxTop
          : newRenderScrollTop < minTop
          ? minTop
          : newRenderScrollTop;

      this.docImgPreviewScrollPos = {
        ...this.docImgPreviewScrollPos,
        scrollTop: newRenderScrollTop,
      };

      this.handleDocImgPreviewScrollPosEffect();
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

    /**
     * 更新文档预览页码索引
     */
    updatePreviewPageIndex() {
      this.$nextTick(() => {
        const $docPreviewRef = this.$refs.docPreviewRef;
        const { bottom: previewDomBottom, height: previewDomHeight } =
          $docPreviewRef?.getBoundingClientRect();
        const items = $docPreviewRef.querySelectorAll('.doc-image-container');
        let i = 1;

        while (i <= items.length) {
          const targetItem = items[i - 1];
          const { bottom } = targetItem?.getBoundingClientRect();

          // 底部大于可视区域底部 或者 底部距离可视区域底部小于1/2，中断循环
          if (
            bottom >= previewDomBottom ||
            (previewDomBottom - bottom) / previewDomHeight < 1 / 2
          ) {
            break;
          }

          i++;
        }
        this.previewPageIndex = i;
      });
    },

    /**
     * 更新sidebar滚动位置
     */
    updateSidebarScrollPos() {
      const $siderbarRef = this.$refs.siderbarRef;
      const items = $siderbarRef.querySelectorAll('img');
      // 查找当前选中的节点
      const currentItem = items[this.previewPageIndex - 1];
      if (!currentItem) return;
      const {
        top: cTop,
        bottom: cBottom,
        height: cHeight,
      } = $siderbarRef.getBoundingClientRect();

      const { top: itemTop, bottom: itemBottom } =
        currentItem.getBoundingClientRect();
      const minScrollTop = 0;
      const maxScrollTop = $siderbarRef.scrollHeight - cHeight;
      const currentScrollTop = $siderbarRef.scrollTop;
      // 需要向上移动
      if (cTop > itemTop) {
        $siderbarRef.scrollTop = Math.max(
          currentScrollTop - (cTop - itemTop),
          minScrollTop
        );
      } else if (itemBottom > cBottom) {
        $siderbarRef.scrollTop = Math.min(
          currentScrollTop + (itemBottom - cBottom),
          maxScrollTop
        );
      }
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

        this.updatePreviewPageIndex();
        this.updateSidebarScrollPos();
      });
    },

    // 重新渲染文档图片
    rerenderDocImg() {
      const { height: oldDocImgRenderHeight } = this.docImgRenderSize;
      const { scrollTop: oldScrollTop } = this.docImgPreviewScrollPos;
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

      // 宽度和或者高度大于可视区域时，计算位置
      if (
        newRenderWidth > docImgPreviewDomWidth ||
        newRenderTotalHeight > docImgPreviewDomHeight
      ) {
        const maxTop = Math.max(
          0,
          newRenderTotalHeight - docImgPreviewDomHeight
        );
        const minTop = 0;
        const maxLeft = Math.max(0, newRenderWidth - docImgPreviewDomWidth);
        const minLeft = 0;

        // 水平居中
        newRenderScrollLeft = maxLeft / 2;

        newRenderScrollTop = this.calcRenderPosition(
          oldScrollTop,
          oldRenderTotalHeight,
          newRenderTotalHeight
        );

        // 是否到上下边界
        newRenderScrollTop =
          newRenderScrollTop < minTop
            ? minTop
            : newRenderScrollTop >= maxTop
            ? maxTop
            : newRenderScrollTop;
        // 是否到左右边界
        newRenderScrollLeft =
          newRenderScrollLeft < minLeft
            ? minLeft
            : newRenderScrollLeft >= maxLeft
            ? maxLeft
            : newRenderScrollLeft;
      } else {
        // TODO: 当缩放到不出滚动条时
        // this.
      }

      this.docImgPreviewScrollPos = {
        scrollLeft: newRenderScrollLeft,
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

      this.rerenderDocImg();
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
      return perHeight * this.getImgNums + Gap * this.getImgNums;
    },
    /**
     * 整体放大或缩小时，需要计算滚动态位置
     */
    calcRenderPosition(oldPos, oldSize, newSize) {
      if (!oldPos || !oldSize || !newSize) return 0;
      return (newSize * oldPos) / oldSize;
    },

    handleMouseWheel(e) {
      // console.log(e)
      // console.log('e.ctrlKey', e.ctrlKey)
      // console.log('e.metaKey', e.metaKey)

      if (!e.ctrlKey) return;
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
      height: 600px;
      background: lightblue;
      overflow: auto;

      > img {
        display: block;
        user-select: none;
        width: 100%;
        height: 100px;
        object-fit: contain;

        & + img {
          margin-top: 10px;
        }

        &.active {
          // 激活变更大小
          // height: 200px;
          border: 1px solid red;
        }
      }
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

    &.sidebar-expand {
      width: 600px;
    }

    .doc-image-container {
      margin: 0 auto 20px auto;
      > img {
        display: block;
        user-select: none;
        width: 100%;
        height: 100%;

        &[lazy='loading'] {
          height: 0;
          & + div {
            display: block;
          }
        }
      }

      > div {
        display: none;
      }
    }

    .anno-container {
      position: absolute;
      background: red;
      opacity: 0.5;
      z-index: 99;
    }
  }

  .control {
    margin-top: 20px;
  }
}
</style>
