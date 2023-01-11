<template>
  <DocImage />
</template>

<script>
import DocImage from './DocImage1.vue';

export default {
  name: 'DocPreview',

  components: { DocImage },
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
