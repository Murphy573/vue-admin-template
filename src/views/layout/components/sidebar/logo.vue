<template>
  <div class="sidebar-logo" :class="{ collapse: collapse }">
    <img src="@/assets/logo.png" class="logo" />
    <transition name="fade">
      <span v-show="!collapse" class="title">管理端模版</span>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'SidebarLogo',

  props: {
    collapse: Boolean,
  },
};
</script>

<style lang="scss" scoped>
.sidebar-logo {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 12px;

  &.collapse {
    justify-content: center;
  }

  .logo {
    width: 20px;
    height: 20px;
  }

  .title {
    font-size: 14px;
    font-weight: 700;
    color: #1b2437;
    margin-left: 10px;
    white-space: nowrap;
  }
}
</style>
