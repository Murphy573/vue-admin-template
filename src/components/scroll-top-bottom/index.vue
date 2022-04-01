<template>
  <transition name="fade">
    <div v-show="visible" class="scroll-top-bottom" :style="customStyle">
      <el-tooltip placement="left" content="返回顶部">
        <div class="top block" @click="handle2Top">
          <i class="el-icon-top"></i>
        </div>
      </el-tooltip>
      <el-tooltip placement="left" content="去底部">
        <div class="bottom block" @click="handle2Bottom">
          <i class="el-icon-bottom"></i>
        </div>
      </el-tooltip>
    </div>
  </transition>
</template>

<script>
import { raf, cancelRaf } from '@/utils/raf.js';

export default {
  name: 'ScrollTopBottom',

  props: {
    visibilityHeight: {
      type: Number,
      default: 200,
    },
    topPosition: {
      type: Number,
      default: 0,
    },
    bottomPositon: {
      type: Number,
      default: -1,
    },
    showBottom: Boolean,
    customStyle: {
      type: Object,
      default: function () {
        return {
          right: '50px',
          bottom: '50px',
          width: '40px',
          height: '80px',
          'border-radius': '4px',
          background: '#e7eaf1',
        };
      },
    },
    transitionName: {
      type: String,
      default: 'fade',
    },
    scrollTargetSelector: {
      type: String,
      default: '#global-main-container',
    },
  },

  data() {
    return {
      visible: false,
      interval: null,
      isMoving: false,
      timer: null,
    };
  },

  computed: {
    cmpt_scrollTarget() {
      return document.querySelector(this.scrollTargetSelector);
    },
  },

  mounted() {
    this.cmpt_scrollTarget.addEventListener('scroll', this.handleScroll);
    this.$once('hook:beforeDestroy', () => {
      this.cmpt_scrollTarget.removeEventListener('scroll', this.handleScroll);
      this.timer && window.clearInterval(this.timer);
    });
  },

  methods: {
    handleScroll() {
      this.visible = this.cmpt_scrollTarget.scrollTop > this.visibilityHeight;
    },
    handle2Top() {
      if (this.isMoving) return;
      const y = this.topPosition;
      this.isMoving = true;
      const start = this.cmpt_scrollTarget.scrollTop;
      let i = 0;

      const step = () => {
        const next = Math.floor(
          this.easeInOutQuad(10 * i, start, this.topPosition - start, 500)
        );

        if (next <= y) {
          this.cmpt_scrollTarget.scrollTo(0, y);
          this.isMoving = false;
          cancelRaf(this.timer);
        } else {
          this.cmpt_scrollTarget.scrollTo(0, next);
          this.timer = raf(step);
        }
        i++;
      };

      cancelRaf(this.timer);
      step();
    },
    handle2Bottom() {
      if (this.isMoving) return;
      let y = this.bottomPositon;
      if (this.bottomPositon < 0) {
        y =
          this.cmpt_scrollTarget.scrollHeight -
          this.cmpt_scrollTarget.clientHeight;
      }
      this.isMoving = true;
      const start = this.cmpt_scrollTarget.scrollTop;
      let i = 0;

      const step = () => {
        const next = Math.floor(
          this.easeInOutQuad(10 * i, start, y - start, 500)
        );

        if (next >= y) {
          this.cmpt_scrollTarget.scrollTo(0, y);
          this.isMoving = false;
          cancelRaf(this.timer);
        } else {
          this.cmpt_scrollTarget.scrollTo(0, next);
          this.timer = raf(step);
        }
        i++;
      };

      cancelRaf(this.timer);
      step();
    },
    // 参数说明:t初始时间,b起始位置,c移动的距离,d缓动执行多长时间
    easeInOutQuad(t, b, c, d) {
      if ((t /= d / 2) < 1) return (c / 2) * t * t + b;
      return (-c / 2) * (--t * (t - 2) - 1) + b;
    },
  },
};
</script>

<style lang="scss" scoped>
.scroll-top-bottom {
  position: fixed;
  z-index: 99;

  .block {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 50%;
    cursor: pointer;

    &:hover {
      color: $--color-primary-projet;
    }
  }
}
</style>
