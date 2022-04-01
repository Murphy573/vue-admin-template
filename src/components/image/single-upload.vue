<template>
  <el-upload
    ref="uploader"
    :action="uploadPath"
    :show-file-list="false"
    :headers="uploadHeader"
    :before-upload="beforeUpload"
    :on-success="uploadSuccess"
    :accept="accept"
    :disabled="disabled">
    <div
      class="single-uploader"
      :class="{ disabled: disabled }"
      :style="containerStyle">
      <img v-if="src" :src="src" class="img" />
      <i v-else class="el-icon-plus uploader-icon" />

      <span
        v-show="showActions && src && !disabled"
        class="actions"
        @click.stop>
        <i
          class="el-icon-edit-outline"
          title="替换图片"
          @click.stop="handleEdit"></i>
        <i
          class="el-icon-delete"
          title="删除图片"
          @click.stop="handleRemove"></i>
        <!-- 操作插槽 -->
        <slot
          name="action"
          :url="value"
          :index="mutipleIndex"
          @click.stop></slot>
      </span>
    </div>
  </el-upload>
</template>

<script>
import { uploadPath } from '@/apis/storage';
import { getToken } from '@/utils/auth';
import { imageCompress } from '@/utils/file';
import { convertImgAddress } from '@/utils/chinalife-img-address.js';

const NOT_CONPRESS_SIZE = 100 * 1024;

export default {
  name: 'SingleImage',

  props: {
    value: String,
    disabled: Boolean,
    width: {
      type: Number,
      default: 145,
    },
    height: {
      type: Number,
      default: 145,
    },
    accept: {
      type: String,
      default: '.jpg,.jpeg,.png,.gif',
    },
    // 图片限定大小：单位M
    limit: {
      type: Number,
      default: 20,
    },
    openCompress: {
      type: Boolean,
      default: false,
    },
    compressRatio: {
      type: Number,
      default: 0.3,
      validate(v) {
        return v > 0 && v < 1;
      },
    },
    // 是否展示操作按钮：删除，预览等
    showActions: Boolean,
    // 是否嵌套在多图片上传组件中
    nestInMutiple: Boolean,
    // 在多图片上传组件中的index
    mutipleIndex: Number,
    // 是否仅添加，不展示上传后的图片
    additional: Boolean,
  },

  data() {
    return {
      uploadPath,
      uploadHeader: {
        'Emall-Admin-Token': getToken(),
      },
    };
  },

  computed: {
    src: {
      set(v) {
        this.$emit('input', v);
      },
      get() {
        return convertImgAddress(this.value);
      },
    },
    containerStyle() {
      return {
        width: this.width + 'px',
        height: this.height + 'px',
      };
    },
  },

  methods: {
    beforeUpload(file) {
      return new Promise((resolve, reject) => {
        const imgType = file.name
          .slice(file.name.lastIndexOf('.') + 1)
          .toLowerCase();
        const isAccept = this.accept.indexOf(imgType) > -1;
        // 图片size提示
        const isLimit = file.size / 1024 <= this.limit * 1024;
        if (!isAccept) {
          this.$message.error(`图片格式只能为${this.accept}!`);
          reject(new Error(`图片格式只能为${this.accept}!`));
          return;
        }
        if (!isLimit) {
          this.$message.error(`图片大小不能超过 ${this.limit}M!`);
          reject(new Error(`图片大小不能超过 ${this.limit}M!`));
          return;
        }
        if (
          file.size <= NOT_CONPRESS_SIZE ||
          !this.openCompress ||
          imgType === 'gif'
        ) {
          resolve(file);
          return;
        }
        imageCompress(file, this.compressRatio).then((res) => {
          resolve(res);
        });
      });
    },
    uploadSuccess(res) {
      if (!this.additional) {
        this.src = res.data.url;
      }
      this.$emit('upload-success', res.data.url);
    },
    handleEdit() {
      // HACK: 查看源码得知如此触发选择文件框
      this.$refs.uploader.$refs['upload-inner'].handleClick();
    },
    handleRemove() {
      if (!this.nestInMutiple) {
        this.src = '';
      } else {
        this.$emit('on-mutiple-remove', this.mutipleIndex);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.single-uploader {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  &.disabled {
    background-color: #f5f7fa;
    border-color: #e4e7ed;
    color: #c0c4cc;
    cursor: not-allowed;
    &:hover {
      border-color: #e4e7ed;
    }
  }
  &:hover {
    border-color: #20a0ff;
  }

  .uploader-icon {
    font-size: 28px;
    color: #8c939d;
  }

  .img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
  }

  .actions {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    cursor: default;
    text-align: center;
    color: #fff;
    opacity: 0;
    font-size: 20px;
    background-color: rgba(0, 0, 0, 0.5);
    -webkit-transition: opacity 0.3s;
    transition: opacity 0.3s;

    i,
    /deep/ i {
      cursor: pointer;

      & + i {
        margin-left: 20px;
      }

      &:hover {
        color: #20a0ff;
      }
    }

    &:hover {
      opacity: 1;
    }
  }
}
</style>
