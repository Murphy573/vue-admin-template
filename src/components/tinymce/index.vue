<template>
  <div v-show="display" class="tinymce-container clearfix">
    <TinymceEditor :init="editorInit" v-model="currentValue" />
  </div>
</template>

<script>
import { api_create_storage } from '@/apis/storage';
import TinymceEditor from '@tinymce/tinymce-vue';
import {
  convertImgAddress,
  revertImgAddress,
} from '@/utils/chinalife-img-address.js';

export default {
  name: 'Tinymce',

  components: { TinymceEditor },

  props: {
    value: {
      type: String,
      default: '',
    },
    height: {
      type: Number,
      default: 500,
    },
  },

  data() {
    const _self = this;

    return {
      display: true,
      editorInit: {
        language: 'zh_CN',
        convert_urls: false,
        height: _self.height,
        // 隐藏水印
        branding: false,
        plugins: [
          'advlist anchor autolink autoresize autosave colorpicker colorpicker contextmenu directionality emoticons fullscreen hr image imagetools importcss insertdatetime link lists media nonbreaking noneditable pagebreak paste preview print save searchreplace spellchecker tabfocus table template textcolor textpattern visualblocks visualchars wordcount',
        ],
        // code codesample 源代码相关toolbar
        toolbar: [
          'searchreplace | bold italic underline strikethrough | alignleft aligncenter alignright outdent indent | undo redo removeformat subscript superscript',
          'fontsizeselect forecolor backcolor | hr bullist numlist | link image media anchor pagebreak insertdatetime table emoticons | preview fullscreen',
        ],
        fontsize_formats: '12px 14px 16px 18px 24px 36px 48px',
        advlist_bullet_styles: 'default,circle,disc,square',
        advlist_number_styles:
          'lower-alpha,lower-roman,upper-alpha,upper-roman',
        images_upload_handler: function (blobInfo, success, failure) {
          const formData = new FormData();
          formData.append('file', blobInfo.blob());
          api_create_storage(formData)
            .then((res) => {
              success(res.url);
            })
            .catch(() => {
              failure('上传失败，请重新上传');
            });
        },
      },
    };
  },

  computed: {
    currentValue: {
      get() {
        return convertImgAddress(this.value);
      },
      set(val) {
        this.$emit('input', revertImgAddress(val));
      },
    },
  },

  beforeDestroy() {
    this.display = false;
  },
};
</script>

<style lang="scss" scoped>
.tinymce-container {
  position: relative;
  ::v-deep .mce-fullscreen {
    z-index: 10000 !important;
  }
}
</style>
