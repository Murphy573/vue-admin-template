<template>
  <div class="tags-view-container">
    <scroll-pane ref="scrollPane"
      class="tags-view-wrapper">
      <router-link v-for="(tag, index) in cmpt_visitedViews"
        ref="tag"
        :key="tag.name"
        :class="tagClass(tag, index)"
        :to="tag"
        tag="span"
        class="tags-view-item"
        @contextmenu.prevent.native="openMenu(tag,$event)">
        {{ generateTitle(tag.meta.title) }}
        <span v-if="!isAffix(tag)"
          class="el-icon-close"
          @click.prevent.stop="closeSelectedTag(tag)" />
      </router-link>
    </scroll-pane>
    <ul v-show="visible"
      :style="{left:left+'px',top:top+'px'}"
      class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">{{ $t('tagsView.refresh') }}</li>
      <li v-if="!isAffix(selectedTag)"
        @click="closeSelectedTag(selectedTag)">{{ $t('tagsView.close') }}</li>
      <li @click="closeOthersTags">{{ $t('tagsView.closeOthers') }}</li>
      <li @click="closeAllTags(selectedTag)">{{ $t('tagsView.closeAll') }}</li>
    </ul>
  </div>
</template>

<script>
import ScrollPane from './ScrollPane';
import { mapActions, mapGetters } from 'vuex';
import { deepCompare } from '@/utils/object';
import { setRedirectRouter } from '@/utils/redirect';

export default {
  components: { ScrollPane },
  data () {
    return {
      visible: false,
      top: 0,
      left: 0,
      selectedTag: {},
      affixTags: [],
      activeTagIndex: -1
    };
  },
  computed: {
    ...mapGetters(['vx_gt_VisitedViews', 'vx_gt_Menus']),
    cmpt_visitedViews () {
      return this.vx_gt_VisitedViews;
    },
    cmpt_tagClass () {
      return {};
    }
  },
  watch: {
    $route () {
      this.addTags();
      this.moveToCurrentTag();
    },
    visible (value) {
      if (value) {
        document.body.addEventListener('click', this.closeMenu);
      }
      else {
        document.body.removeEventListener('click', this.closeMenu);
      }
    }
  },
  mounted () {
    this.initTags();
    this.addTags();
  },
  methods: {
    ...mapActions([
      'vx_ac_AddView',
      'vx_ac_AddVisitedView',
      'vx_ac_UpdateVisitedView',
      'vx_ac_DelView',
      'vx_ac_DelCachedView',
      'vx_ac_DelOthersViews',
      'vx_ac_DelAllViews'
    ]),
    generateTitle (title) {
      return this.$t(`navigation.${title}`);
    },
    tagClass (tag, index) {
      this.activeTagIndex = this.cmpt_visitedViews.findIndex(tag => tag.name === this.$route.name);
      return {
        active: tag.name === this.$route.name,
        breakline: index !== this.activeTagIndex && index !== this.activeTagIndex - 1
      };
    },
    isActive (route) {
      return route.name === this.$route.name;
    },
    isAffix (tag) {
      return tag.meta && tag.meta.affix;
    },
    buildTagData (route) {
      const { name, meta, query, params } = route;
      return {
        name,
        meta: { ...meta },
        query,
        params
      };
    },
    filterAffixTags (menus) {
      let tags = [];
      menus.forEach(menu => {
        if (menu.meta.affix && !menu.children) {
          tags.push(this.buildTagData(menu));
        }
        if (menu.children) {
          const tempTags = this.filterAffixTags(menu.children);
          if (tempTags.length >= 1) {
            tags = [...tags, ...tempTags];
          }
        }
      });
      return tags;
    },
    initTags () {
      this.affixTags = this.filterAffixTags(this.vx_gt_Menus);
      for (const tag of this.affixTags) {
        // Must have tag name
        if (tag.name) {
          this.vx_ac_AddVisitedView(tag);
        }
      }
    },
    addTags () {
      const { name, meta } = this.$route;
      if (meta && meta.showTag === false) return;
      if (name) {
        this.vx_ac_AddView(this.buildTagData(this.$route));
      }
      return false;
    },
    moveToCurrentTag () {
      const tags = this.$refs.tag;
      this.$nextTick(() => {
        for (const tag of tags) {
          if (tag.to.name === this.$route.name) {
            this.$refs.scrollPane.moveToTarget(tag);
            // when query is different then update
            const _cur = this.buildTagData(this.$route);
            if (!deepCompare(tag.to, _cur)) {
              this.vx_ac_UpdateVisitedView(_cur);
            }
            break;
          }
        }
      });
    },
    refreshSelectedTag (view) {
      this.vx_ac_DelCachedView(view);
      this.toRedirect(view);
    },
    closeSelectedTag (view) {
      this.vx_ac_DelView(view);
      if (this.isActive(view)) {
        this.toLastView(view);
      }
    },
    closeOthersTags () {
      this.vx_ac_DelOthersViews(this.selectedTag);
      this.$router.push(this.selectedTag);
      this.moveToCurrentTag();
    },
    closeAllTags (view) {
      this.vx_ac_DelAllViews();
      if (this.affixTags.some(tag => tag.name === view.name)) {
        return;
      }
      this.toLastView(view);
    },
    toLastView (view) {
      const latestView = this.cmpt_visitedViews.slice(-1)[0];
      if (latestView) {
        this.$router.push(latestView);
      }
      else {
        this.toRedirect({ name: 'dashboard' });
      }
    },
    toRedirect (view) {
      setRedirectRouter(view);
      this.$router.replace({ name: 'redirect' });
    },
    openMenu (tag, e) {
      const menuMinWidth = 105;
      const offsetLeft = this.$el.getBoundingClientRect().left; // container margin left
      const offsetWidth = this.$el.offsetWidth; // container width
      const maxLeft = offsetWidth - menuMinWidth; // left boundary
      const left = e.clientX - offsetLeft + 15; // 15: margin right

      if (left > maxLeft) {
        this.left = maxLeft;
      }
      else {
        this.left = left;
      }

      this.top = e.clientY;
      this.visible = true;
      this.selectedTag = tag;
    },
    closeMenu () {
      this.visible = false;
    }
  }
};
</script>

<style lang="scss" scoped>
$--top: 10px;

.tags-view-container {
  height: $--size-tagHeight;
  padding-top: $--top;
  width: 100%;
  background: #ffffff;

  .tags-view-wrapper {
    .tags-view-item {
      flex: none;
      min-width: 80px;
      position: relative;
      cursor: pointer;
      height: calc(#{$--size-tagHeight} - #{$--top});
      line-height: calc(#{$--size-tagHeight} - #{$--top});
      color: #1b2437;
      background: #fff;
      padding: 0 12px 0 12px;
      font-size: 12px;
      user-select: none;
      text-align: center;

      &:not(:last-of-type).breakline::after {
        content: '';
        position: absolute;
        width: 1px;
        height: 18px;
        top: 50%;
        right: 1px;
        background: #838ca1;
        transform: translateY(-50%);
      }

      &:first-of-type {
        margin-left: 12px;
      }

      &.active {
        background-color: #f5f7fa;
        border-radius: 8px 8px 0 0;
      }
    }
  }
  .contextmenu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: absolute;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #333;
    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);
    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      &:hover {
        background: #eee;
      }
    }
  }
}
</style>

<style lang="scss">
//reset element css of el-icon-close
.tags-view-wrapper {
  .tags-view-item {
    .el-icon-close {
      font-size: 12px;
      margin-left: 30px;
      border-radius: 50%;
      text-align: center;

      &:hover {
        color: $--color-menu-primary;
      }
    }
  }
}
</style>
