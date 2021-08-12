<template>
  <el-image v-bind="$attrs"
    v-on="$listeners"
    :src="cmpt_src"
    :style="cmpt_style"
    :preview-src-list="cmpt_previewSrcList"
    :fit="fit">
    <div slot="error"
      class="image-error image-slot">
      <i class="el-icon-picture-outline"></i>
      <div class="image-error-tip">
        {{cmpt_src ? '加载失败': '暂无图片'}}
      </div>
    </div>
    <div slot="placeholder"
      class="image-loading image-slot">
      加载中<span class="dot">...</span>
    </div>
  </el-image>
</template>

<script>
import { convertImgAddress } from '@/utils/chinalife-img-address.js';
import { addUnit } from '@/utils/dom';

export default {
  name: 'ImagePreview',

  props: {
    src: String,
    fit: {
      type: String,
      default: 'fill'
    },
    previewSrcList: {
      type: Array,
      default () {
        return null;
      }
    },
    width: {
      type: [String, Number],
      default: 60
    },
    height: {
      type: [String, Number],
      default: 60
    }
  },

  computed: {
    cmpt_src () {
      return convertImgAddress(this.src);
    },
    cmpt_style () {
      return {
        width: addUnit(this.width),
        height: addUnit(this.height)
      };
    },
    cmpt_previewSrcList () {
      const list = Array.isArray(this.previewSrcList)
        ? this.previewSrcList.map(v => {
          return convertImgAddress(v);
        })
        : [];
      return list;
    }
  }
};
</script>

<style lang="scss" scoped>
/deep/ {
  .image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: #f5f7fa;
    color: #909399;
    font-size: 24px;
  }
  .image-error {
    flex-direction: column;

    .image-error-tip {
      font-size: 10px;
    }
  }

  .image-loading {
    flex-direction: row;
    font-size: 10px;
  }
}
</style>
