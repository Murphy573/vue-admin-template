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
        :class="{ 'sidebar-expand': sidebarExpand }">
        <div
          class="doc-images"
          ref="docImgsContainerRef"
          :style="genPreviewStyle">
          <div
            v-for="(item, index) of imgUrls"
            :key="index"
            :style="[genDocImgRenderStyle]"
            class="doc-image-container">
            <img v-lazy="item" />
            <div>加载中。。。</div>
          </div>
        </div>

        <div class="anno-container" :style="genAnnoStyle"></div>
      </div>
    </div>

    <div class="control">
      <el-tag type="danger" style="margin-right: 20px">
        当前比率：{{ previewOpts.currentScale | percent }}
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
      <el-button @click="resizeDocImg2Adaptive(false)">自适应填充</el-button>
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
  name: 'DocPreview1',

  data() {
    return {
      imgUrls: [
        'https://picsum.photos/id/1/1366/768',
        'https://picsum.photos/id/2/1366/768',
        'https://picsum.photos/id/3/1366/768',
        'https://picsum.photos/id/4/1366/768',
        'https://picsum.photos/id/5/1366/768',
        'https://picsum.photos/id/6/1366/768',
        'https://picsum.photos/id/7/1366/768',
        'https://picsum.photos/id/8/1366/768',
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

      previewOpts: {
        // 移动的位置translate x y
        pos: {
          x: 0,
          y: 0,
        },
        // 当前缩放比
        currentScale: 1,
        // 自适应预览容器缩放比
        adaptiveScale: 1,
        //形变中心点
        transformOrigin: {
          x: 0,
          y: 0,
        },
        // 是否是抓取
        craping: false,
        // 抓取起点
        crapStartPos: {
          x: 0,
          y: 0,
        },
      },
      // 最小比率
      minPercent: 0.3,
      // 最大比率
      maxPercent: 4,
      btnZoomStepPercent: 0.1,
    };
  },

  computed: {
    genDocImgRenderStyle() {
      const { width, height } = this.docImgOriginSize;
      return {
        width: width + 'px',
        height: height + 'px',
      };
    },
    genPreviewStyle() {
      const translate = `translate3D(${this.previewOpts.pos.x}px, ${this.previewOpts.pos.y}px, 0px) scale(${this.previewOpts.currentScale})`;
      const transformOrigin = `${this.previewOpts.transformOrigin.x}px ${this.previewOpts.transformOrigin.y}px`;
      return {
        transform: translate,
        cursor: this.previewOpts.craping ? 'grabbing' : 'grab',
        'transform-origin': transformOrigin,
        // margin: '0px',
      };
    },
    genAnnoStyle() {
      const { top, left, active } = this.annoOptions;
      const { width, height } = {
        width: this.docImgOriginSize.width * this.previewOpts.currentScale,
        height: this.docImgOriginSize.height * this.previewOpts.currentScale,
      };

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

        this.handleDocImgPreviewTranslatePosEffect();
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
      const items = $docPreviewRef.querySelectorAll('.doc-image-container');
      if (!items.length) return;
      const offsetTop = items[pageIndex - 1].offsetTop;
      this.setPosByHandledBoundary({
        x: this.previewOpts.pos.x,
        y: -offsetTop * this.previewOpts.currentScale,
      });
      this.handleDocImgPreviewTranslatePosEffect();
    },
    // 放大
    zoomIn(addPercent) {
      let addedPercent = this.previewOpts.currentScale + addPercent;
      addPercent = Math.max(addPercent, MaxPercent);
      // 相等不渲染
      if (addedPercent === this.previewOpts.currentScale) return;

      const transformOrigin = this.getDocPreviewCenterOrigin();

      const oldScale = this.previewOpts.currentScale;
      this.previewOpts.currentScale = addedPercent;
      this.setPosByHandledBoundary({
        x: this.calcFinalTranslatePos(
          this.previewOpts.pos.x,
          addedPercent,
          oldScale,
          transformOrigin.x
        ),
        y: this.calcFinalTranslatePos(
          this.previewOpts.pos.y,
          addedPercent,
          oldScale,
          transformOrigin.y
        ),
      });

      this.handleDocImgPreviewTranslatePosEffect();
    },
    // 缩小
    zoomOut(minusPercent) {
      let minusedPercent = this.previewOpts.currentScale - minusPercent;
      minusedPercent = Math.max(minusedPercent, MinPercent);
      // 相等不渲染
      if (minusedPercent === this.previewOpts.currentScale) return;

      const transformOrigin = this.getDocPreviewCenterOrigin();
      const oldScale = this.previewOpts.currentScale;
      this.previewOpts.currentScale = minusedPercent;
      this.setPosByHandledBoundary({
        x: this.calcFinalTranslatePos(
          this.previewOpts.pos.x,
          minusedPercent,
          oldScale,
          transformOrigin.x
        ),
        y: this.calcFinalTranslatePos(
          this.previewOpts.pos.y,
          minusedPercent,
          oldScale,
          transformOrigin.y
        ),
      });
      this.handleDocImgPreviewTranslatePosEffect();
    },

    /**
     * 获取图片容器在可视区域页面的中心点
     */
    getDocPreviewCenterOrigin() {
      const docPreviewRect = this.getDocPreviewClientRect();
      if (!docPreviewRect) return;
      const {
        pos: { x, y },
        // 变换前的scale
        currentScale,
      } = this.previewOpts;
      const { width, height } = docPreviewRect;

      return {
        x: this.calcRelativeTransformOrigin(x, width / 2, currentScale),
        y: this.calcRelativeTransformOrigin(y, height / 2, currentScale),
      };
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

    /**
     * 当滚动位置发生变化
     * 1. 更新文档页码
     */
    handleDocImgPreviewTranslatePosEffect(isSetScrollPos = true) {
      this.$nextTick(() => {
        this.updatePreviewPageIndex();
        this.updateSidebarScrollPos();
      });
    },

    // 重新渲染文档图片
    rerenderDocImg() {
      this.handleDocImgPreviewTranslatePosEffect();
    },
    /**
     * 自适应填充
     */
    resizeDocImg2Adaptive(isInit = false) {
      const { width: docImgOriginWidth, height: docImgOriginHeight } =
        this.docImgOriginSize;
      const { width: docImgPreviewDomWidth, height: docImgPreviewDomHeight } =
        this.docImgPreviewDomSize;

      const docImgRatio = docImgOriginWidth / docImgOriginHeight;
      const docPreviewRatio = docImgPreviewDomWidth / docImgPreviewDomHeight;

      const isFullHeight = docImgRatio < docPreviewRatio;
      const adaptiveSize = isFullHeight
        ? docImgPreviewDomHeight
        : docImgPreviewDomWidth;

      let newScale = 0;
      if (isFullHeight) {
        this.docImgRenderSize.height = adaptiveSize;
        newScale = adaptiveSize / docImgOriginHeight;
        this.docImgRenderSize.width = newScale * docImgOriginWidth;
      } else {
        this.docImgRenderSize.width = adaptiveSize;
        newScale = adaptiveSize / docImgOriginWidth;
        this.docImgRenderSize.height = newScale * docImgOriginHeight;
      }

      // 初始化时新旧scale一致
      let oldScale = this.previewOpts.currentScale;
      if (isInit) {
        this.previewOpts.adaptiveScale = newScale;
        oldScale = newScale;
      }
      const transformOrigin = this.getDocPreviewCenterOrigin();
      this.previewOpts.currentScale = newScale;

      this.setPosByHandledBoundary({
        x: this.calcFinalTranslatePos(
          this.previewOpts.pos.x,
          newScale,
          oldScale,
          transformOrigin.x
        ),
        y: this.calcFinalTranslatePos(
          this.previewOpts.pos.y,
          newScale,
          oldScale,
          transformOrigin.y
        ),
      });

      this.rerenderDocImg();
    },

    /**
     * 计算整体高度
     */
    calcTotalHeight(perHeight) {
      return perHeight * this.getImgNums + Gap * this.getImgNums;
    },

    // 获取图片预览容器位置，大小
    getDocPreviewClientRect() {
      const $docPreviewRef = this.$refs.docPreviewRef;
      if (!$docPreviewRef) return null;

      const docPreviewRect = $docPreviewRef.getBoundingClientRect();
      return {
        top: docPreviewRect.top,
        left: docPreviewRect.left,
        x: docPreviewRect.x,
        y: docPreviewRect.y,
        width: docPreviewRect.width,
        height: docPreviewRect.height,
      };
    },

    // 开始拖砖
    handleStartGrap(e) {
      this.previewOpts.craping = true;
      this.previewOpts.crapStartPos = {
        x: e.clientX,
        y: e.clientY,
      };

      this.$refs.docPreviewRef?.addEventListener?.(
        'mousemove',
        this.handleGraping
      );
    },

    // 拖拽中
    handleGraping(e) {
      let deltaX = this.previewOpts.crapStartPos.x - e.clientX;
      let deltaY = this.previewOpts.crapStartPos.y - e.clientY;
      this.previewOpts.crapStartPos = {
        x: e.clientX,
        y: e.clientY,
      };

      let posX = this.previewOpts.pos.x - deltaX;
      let posY = this.previewOpts.pos.y - deltaY;

      this.setPosByHandledBoundary({ x: posX, y: posY });
    },
    // 结束拖拽
    handleEndGrap() {
      this.previewOpts.craping = false;
      this.$refs.docPreviewRef?.removeEventListener?.(
        'mousemove',
        this.handleGraping
      );
    },
    /**
     * 计算相对transformOrigin
     * @param translatePos
     */
    calcRelativeTransformOrigin(translatePos, eventOffsetPos, currentScale) {
      return (-translatePos + eventOffsetPos) / currentScale;
    },
    /**
     * 计算放大缩小调整后的translate位置
     */
    calcFinalTranslatePos(
      curTranslatePos,
      newScale,
      oldScale,
      transformOriginPos
    ) {
      return curTranslatePos - (newScale - oldScale) * transformOriginPos;
    },
    // 滚轮放大
    handleScaleByWheel(e) {
      const docPreviewRect = this.getDocPreviewClientRect();
      if (!docPreviewRect) return;
      const { clientX, clientY } = e;
      const oldScale = this.previewOpts.currentScale;
      const transformOrigin = {
        x: this.calcRelativeTransformOrigin(
          this.previewOpts.pos.x,
          clientX - docPreviewRect.left,
          oldScale
        ),
        y: this.calcRelativeTransformOrigin(
          this.previewOpts.pos.y,
          clientY - docPreviewRect.top,
          oldScale
        ),
      };

      // 计算最新缩放比例
      const whellRate = 0.01 * 70;
      let newScale = 0;
      if (e.deltaY > 0) {
        newScale = oldScale - this.btnZoomStepPercent * whellRate;
        newScale = Math.max(MinPercent, newScale);
      } else {
        newScale = oldScale + this.btnZoomStepPercent * whellRate;
        newScale = Math.min(MaxPercent, newScale);
      }
      this.previewOpts.currentScale = newScale;

      this.setPosByHandledBoundary({
        x: this.calcFinalTranslatePos(
          this.previewOpts.pos.x,
          newScale,
          oldScale,
          transformOrigin.x
        ),
        y: this.calcFinalTranslatePos(
          this.previewOpts.pos.y,
          newScale,
          oldScale,
          transformOrigin.y
        ),
      });

      this.handleDocImgPreviewTranslatePosEffect();
    },
    // 滚轮移动
    handleMoveByWheel(e) {
      let deltaY = e.deltaY;
      let deltaX = e.deltaX;
      let posX = this.previewOpts.pos.x - deltaX;
      let posY = this.previewOpts.pos.y - deltaY;

      this.setPosByHandledBoundary({ x: posX, y: posY });
      this.handleDocImgPreviewTranslatePosEffect();
    },

    // 设置经过边界处理后的位置
    setPosByHandledBoundary({ x, y }) {
      this.$nextTick(() => {
        const imgsContainerRect =
          this.$refs.docImgsContainerRef?.getBoundingClientRect?.();
        const docPreviewRect = this.getDocPreviewClientRect();
        if (!imgsContainerRect || !docPreviewRect) return;

        const maxX = docPreviewRect.width / 2;
        const minX = -imgsContainerRect.width + docPreviewRect.width / 2;
        const maxY = 0;
        const minY = -imgsContainerRect.height + docPreviewRect.height / 2;

        x = x > maxX ? maxX : x < minX ? minX : x;
        y = y > maxY ? maxY : y < minY ? minY : y;

        this.previewOpts.pos = { x, y };
      });
    },

    handleWheelEvent(e) {
      e?.preventDefault?.();
      if (e.ctrlKey) {
        this.handleScaleByWheel(e);
      } else {
        this.handleMoveByWheel(e);
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

        this.resizeDocImg2Adaptive(true);

        this.bindEvent();
      } catch (error) {}
    },

    bindEvent() {
      const $docPreviewRef = this.$refs.docPreviewRef;

      $docPreviewRef?.addEventListener?.('wheel', this.handleWheelEvent);
      $docPreviewRef?.addEventListener?.('mousedown', this.handleStartGrap);
      $docPreviewRef?.addEventListener?.('mouseup', this.handleEndGrap);
      $docPreviewRef?.addEventListener?.('mouseout', this.handleEndGrap);
    },
    destoryEvent() {
      const $docPreviewRef = this.$refs.docPreviewRef;

      $docPreviewRef?.addEventListener?.('wheel', this.handleWheelEvent);
      $docPreviewRef?.addEventListener?.('mousedown', this.handleStartGrap);
      $docPreviewRef?.addEventListener?.('mouseup', this.handleEndGrap);
      $docPreviewRef?.addEventListener?.('mouseout', this.handleEndGrap);
    },
  },

  mounted() {
    this.initilize();
  },

  beforeDestroy() {
    this.destoryEvent();
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
    overflow: hidden;
    cursor: grab;

    /* 当高度撑不开可视区域时，垂直居中 */
    &.center-active {
      display: flex;
      justify-content: center;
      flex-flow: column nowrap;
    }

    &.sidebar-expand {
      width: 600px;
    }

    .doc-images {
      position: relative;
      width: fit-content;
    }

    .doc-image-container {
      margin: 0 auto 20px auto;
      > img {
        display: block;
        user-select: none;
        pointer-events: none;
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
