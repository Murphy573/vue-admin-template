<template>
  <div class="sidebar-wrapper" :class="[cmpt_wrapperClass, cmpt_hideSidebar]">
    <div
      v-if="vx_gt_showSidebarLogo"
      class="siderbar-logo"
      :class="cmpt_hideSidebar">
      <SidebarLogo :collapse="!vx_gt_Sidebar.opened" />
    </div>
    <div class="sidebar-menu" :class="cmpt_hideSidebar">
      <el-scrollbar wrap-class="scrollbar-wrapper">
        <el-menu
          mode="vertical"
          :default-active="vx_gt_ActiveMenu"
          :collapse="cmlt_isCollapse"
          :collapse-transition="false"
          :unique-opened="false"
          @select="setCurrentMenu">
          <sidebar-item
            v-for="item of vx_gt_Menus"
            :item="item"
            :key="item.name"></sidebar-item>
        </el-menu>
      </el-scrollbar>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import SidebarItem from './sidebar-item';
import SidebarLogo from './logo';

export default {
  name: 'Sidebar',
  components: { SidebarItem, SidebarLogo },
  computed: {
    ...mapGetters([
      'vx_gt_ActiveMenu',
      'vx_gt_Menus',
      'vx_gt_Sidebar',
      'vx_gt_showSidebarLogo',
    ]),
    cmlt_isCollapse() {
      return !this.vx_gt_Sidebar.opened;
    },
    cmpt_wrapperClass() {
      return {
        withoutAnimation: this.vx_gt_Sidebar.withoutAnimation,
      };
    },
    cmpt_hideSidebar() {
      return { hideSidebar: !this.vx_gt_Sidebar.opened };
    },
  },
  methods: {
    ...mapActions(['vx_ac_SetActiveMenu']),
    setCurrentMenu(name) {
      this.$router.push({ name });
    },
  },
};
</script>

<style lang="scss" scoped>
.sidebar-wrapper {
  display: flex;
  flex-flow: column nowrap;

  width: $--size-menuNormalWidth !important;
  height: 100%;
  transition: width 0.28s;
  background-color: #ffffff;
  overflow: hidden;
  z-index: 1001;

  &.withoutAnimation {
    transition: none;
  }
  &.hideSidebar {
    width: $--size-menuCollapseWidth !important;
  }

  .siderbar-logo {
    height: $--size-navHeight;
    width: 100%;
    flex: none;
    box-shadow: 0 1px 0 0 #ebedf0;
    z-index: 9999;
  }

  .sidebar-menu {
    flex: 1;
    overflow: hidden;
    width: 100% !important;
    background-color: #ffffff;

    ::v-deep {
      .el-scrollbar {
        width: 100%;
        height: 100%;

        .scrollbar-wrapper {
          overflow-x: hidden !important;
        }

        .el-scrollbar__bar {
          &.is-vertical {
            right: 0;
          }
          &.is-horizontal {
            display: none;
          }
        }
      }

      .el-menu {
        border: none;
        height: 100%;
        width: 100% !important;
      }
    }

    &.hideSidebar {
      width: $--size-menuCollapseWidth !important;

      ::v-deep {
        .submenu-title-noDropdown {
          padding: 0 !important;
          position: relative;

          .el-tooltip {
            padding: 0 !important;

            .svg-icon {
              margin-left: 20px;
            }
          }
        }

        .el-submenu {
          overflow: hidden;

          & > .el-submenu__title {
            padding: 0 !important;

            .svg-icon {
              margin-left: 20px;
            }

            .el-submenu__icon-arrow {
              display: none;
            }
          }
        }

        .el-menu--collapse {
          .el-submenu {
            & > .el-submenu__title {
              & > span {
                height: 0;
                width: 0;
                overflow: hidden;
                visibility: hidden;
                display: inline-block;
              }
            }
          }
        }
      }
    }
  }
}
</style>

<style lang="scss">
// 收缩后弹出子菜单
.el-menu--vertical {
  max-height: 100%;
  overflow-y: auto;
}
</style>
