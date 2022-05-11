<template>
  <div class="sidebar-item-container">
    <el-submenu
      v-if="item.children && item.children.length"
      :index="item.name"
      popper-append-to-body>
      <!-- 创建菜单分组 -->
      <template slot="title">
        <Item :icon="item.meta.icon" :title="generateTitle(item.meta.title)" />
      </template>
      <!-- 递归调用自身，直到subItem不含有子节点 -->
      <sidebar-item
        v-for="subItem of item.children"
        :item="subItem"
        :key="subItem.name"></sidebar-item>
    </el-submenu>

    <el-menu-item v-else :index="item.name">
      <Item :icon="item.meta.icon" :title="generateTitle(item.meta.title)" />
    </el-menu-item>
  </div>
</template>

<script>
import Item from './Item';

export default {
  name: 'sidebar-item',

  components: { Item },

  props: {
    item: {
      type: Object,
      require: true,
    },
  },

  methods: {
    generateTitle(title) {
      return this.$t(`navigation.${title}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.menu-item-height--define {
  height: 48px;
  line-height: 48px;
}

.sidebar-item-container {
  ::v-deep {
    // 无嵌套的item
    .el-menu-item {
      color: $--color-menuItemText;
      background: $--color-menuItemBg;

      &:not(.is-active):hover {
        background: $--color-menuItemHoverBg !important;
      }
      &.is-active {
        color: $--color-menuItemActiveText;
        background: $--color-menuItemActiveBg;
        font-weight: bold;
        .svg-icon {
          color: $--color-menuItemActiveText;
        }
      }
    }
    // icon颜色
    .svg-icon {
      margin-right: 10px;
      color: $--color-menu-primary;
    }

    // 嵌套的
    .el-submenu {
      .el-submenu__title {
        display: flex;
        align-items: center;
        color: $--color-submenuTitleText;
        background: $--color-submenuTitleBg;

        &:hover {
          background: $--color-submenuTitleHoverBg !important;
        }
      }
      // 嵌套2级以上，对齐
      .el-submenu {
        .el-submenu__title {
          > span {
            margin-left: 4px;
          }
        }
      }
      // 箭头
      .el-submenu__icon-arrow {
        color: $--color-menuItemText;
      }

      .el-menu-item {
        @extend .menu-item-height--define;
        color: $--color-submenuItemText;
        background: $--color-submenuItemBg;
        // 对齐
        > span {
          margin-left: 4px;
        }

        &:not(.is-active):hover {
          background: $--color-submenuItemHoverBg !important;
        }
      }

      // 嵌套激活
      &.is-active {
        > .el-submenu__title {
          color: $--color-submenuTitleActiveText !important;
          background: $--color-submenuTitleActiveBg;
          font-weight: bold;
          // icon颜色
          .svg-icon {
            color: $--color-submenuTitleActiveText;
          }
        }
        .el-menu-item {
          &.is-active {
            color: $--color-submenuItemActiveText;
            background: $--color-submenuItemActiveBg;
            font-weight: bold;
          }
        }
      }
    }
  }
}
</style>
