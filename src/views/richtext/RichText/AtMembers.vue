<template>
  <div
    v-show="visible"
    ref="atMembers"
    class="at-members"
    :style="genDisplayStyle"
    v-clickoutside:WeiboRichtext
    @click.stop>
    <ul>
      <li
        v-for="(m, index) of filterredMembers"
        :key="m.id"
        :class="[{ select: currentIndex === index }, genItemCountClass(index)]"
        @click="handleSelectItem(index)">
        {{ m.name }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'AtMembers',

  props: {
    // 是否展示，支持.sync
    visible: Boolean,
    // 搜索字段
    searchKeyword: {
      type: String,
      default: '',
    },
    loopSelect: {
      type: Boolean,
      default: true,
    },
    pos: {
      type: Object,
      default: () => ({ x: 0, y: 0 }),
    },
  },

  data() {
    return {
      members: new Array(10).fill('').map((v, k) => {
        return {
          id: `id${k + 1}`,
          name: `用户${k + 1}`,
        };
      }),
      filterredMembers: [],
      currentIndex: 0,
      isCompositionning: false,
    };
  },

  computed: {
    genDisplayStyle() {
      const { x, y } = this.pos;
      return {
        left: x + 'px',
        top: y + 'px',
      };
    },
  },

  watch: {
    searchKeyword: {
      handler(newVal) {
        this.currentIndex = 0;

        this.filterredMembers = this.members.filter((m) => {
          return m.name.includes(newVal?.trim() || '');
        });
      },
      immediate: true,
    },
  },

  methods: {
    syncVisible(v = false) {
      this.$emit('update:visible', v);
    },

    genItemCountClass(index) {
      return `my-member-item-count--${index}`;
    },

    handleGlobalKeydown(event) {
      if (!this.visible || this.isCompositionning) return;
      const { key } = event;

      const keyFuncMap = {
        ArrowUp: () => {
          event.preventDefault();
          if (this.currentIndex > 0) {
            this.currentIndex--;
          } else {
            this.loopSelect &&
              (this.currentIndex = this.filterredMembers.length - 1);
          }
          this.scrollIntoView();
        },
        ArrowDown: () => {
          event.preventDefault();
          if (this.currentIndex < this.filterredMembers.length - 1) {
            this.currentIndex++;
          } else {
            this.loopSelect && (this.currentIndex = 0);
          }

          this.scrollIntoView();
        },
        Tab: () => {
          event.preventDefault();
          this.handleSelectItem(this.currentIndex);
        },
        Enter: () => {
          event.preventDefault();
          this.handleSelectItem(this.currentIndex);
        },
        Escape: () => {
          event.preventDefault();
          this.handleCancelSelectItem();
        },
      };

      keyFuncMap[key] && keyFuncMap[key]();
    },

    handleCancelSelectItem() {
      this.syncVisible(false);
      this.$emit('on-cancel-select');
    },

    handleSelectItem(index) {
      const item = this.filterredMembers[index];
      if (!item) return;
      this.syncVisible(false);
      this.$emit('on-select', this.filterredMembers[index]);
    },

    scrollIntoView() {
      this.$nextTick(() => {
        const container = this.$refs.atMembers;
        const currentItem = document.querySelector(
          `.at-members .${this.genItemCountClass(this.currentIndex)}`
        );

        const {
          top: cTop,
          bottom: cBottom,
          height: cHeight,
        } = container.getBoundingClientRect();

        const { top: itemTop, bottom: itemBottom } =
          currentItem.getBoundingClientRect();

        const minScrollTop = 0;
        const maxScrollTop = container.scrollHeight - cHeight;
        const currentScrollTop = container.scrollTop;

        // 需要向上移动
        if (cTop > itemTop) {
          container.scrollTop = Math.max(
            currentScrollTop - (cTop - itemTop),
            minScrollTop
          );
        } else if (itemBottom > cBottom) {
          container.scrollTop = Math.min(
            currentScrollTop + (itemBottom - cBottom),
            maxScrollTop
          );
        }
      });
    },

    handleCompositionStart() {
      this.isCompositionning = true;
    },

    handleCompositionEnd() {
      this.isCompositionning = false;
    },
  },

  mounted() {
    document.addEventListener('keydown', this.handleGlobalKeydown);
    document.addEventListener('compositionstart', this.handleCompositionStart);
    document.addEventListener('compositionend', this.handleCompositionEnd);
  },

  beforeDestory() {
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    document.removeEventListener(
      'compositionstart',
      this.handleCompositionStart
    );
    document.removeEventListener('compositionend', this.handleCompositionEnd);
  },
};
</script>

<style lang="scss" scoped>
.at-members {
  position: absolute;
  left: 0;
  top: 0;
  width: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 200px;
  max-width: 300px;
  background: pink;
  user-select: none;

  ul {
    li {
      cursor: pointer;
      line-height: 30px;
      border-bottom: 1px solid #ddd;

      &.select,
      &:hover {
        background: red;
      }
    }
  }
}
</style>
