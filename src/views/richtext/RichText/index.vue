<template>
  <div>
    <div
      ref="richtextRef"
      class="my-richtext"
      :placeholder="placeholder"
      tabindex="0"
      spellcheck="true"
      contenteditable="true"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup="handleKeyup"
      @click="handleClick">
      123
      <span contenteditable="false"> span0 </span>&nbsp;
      <span contenteditable="false"> span1 </span>&nbsp;
    </div>

    <el-button @click="handleClickAtBtn">@</el-button>
  </div>
</template>

<script>
export default {
  name: 'Richtext',

  props: {
    placeholder: {
      type: String,
      default: '输入文案...',
    },
  },

  data() {
    return {
      richtextEditor: null,
      richtextEditorOptions: {
        isFocus: false,
      },
      // 记录上一次的选区位置
      lastRangeRecord: null,
    };
  },

  computed: {},

  mounted() {
    this.$nextTick(() => {
      this.richtextEditor = this.$refs.richtextRef || null;

      if (!this.richtextEditor) return;
    });
  },

  methods: {
    handleClickAtBtn() {
      this.setRichtextEditorFocus();

      // 没有range记录则是首次编辑，直接将光标移至末尾
      if (!this.lastRangeRecord) {
        this.richtextEditor.appendChild(this.createEditPlaceholderNode('@'));
        this.moveCaret2StartOrEnd('end');
      } else {
        /**
         * 有range记录则不是首次编辑
         */
        // step1. 先复原记录的选区
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(this.lastRangeRecord);
        this.$nextTick(() => {
          const sel1 = window.getSelection();
          const range = sel1?.getRangeAt(0);
          // step2. 删除选区内容
          range.deleteContents();

          // step3. 添加at编辑节点并将光标移至at节点后面
          const atEditor = this.createEditPlaceholderNode('@');
          range.insertNode(atEditor);
          sel1.removeAllRanges();
          const range1 = document.createRange();
          range1.setStartAfter(atEditor);
          range1.collapse(true);
          sel1.addRange(range1);
          // step4. 更新记录选区
          this.setLastRangeRecord();
        });
      }
    },

    setRichtextEditorFocus() {
      this.richtextEditor?.focus();
      this.richtextEditorOptions.isFocus = true;
    },

    // 移动光标到开头或者
    moveCaret2StartOrEnd(type = 'start') {
      const sel = window.getSelection();
      sel.selectAllChildren(this.richtextEditor);
      //光标移至开头
      if (type === 'start') {
        sel.collapseToStart();
      } else {
        //光标移至末尾
        sel.collapseToEnd();
      }
    },

    // 创建可编辑占位节点
    createEditPlaceholderNode(identifier = '@') {
      const font = document.createElement('font');
      font.setAttribute('class', 'editor-node');
      font.setAttribute('contenteditable', 'true');
      font.innerText = identifier;

      return font;
    },

    handleClick(event) {
      const target = event.target;
      if (target.getAttribute('contenteditable') === 'false') {
        let nextEle = target.nextSibling;
        const newTextNode = document.createTextNode('');
        if (!nextEle) {
          this.richtextEditor?.appendChild(newTextNode);
        } else {
          this.richtextEditor.insertBefore(newTextNode, nextEle);
        }
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(newTextNode, 0);
        range.setEnd(newTextNode, 0);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      // 记录上一次的选区位置
      this.setLastRangeRecord();
    },

    handleKeyup() {
      // 记录上一次的选区位置
      this.setLastRangeRecord();
    },

    handleFocus() {
      // eslint-disable-next-line no-console
      console.log('handleFocus');
    },

    // 丢失焦点
    handleBlur() {
      this.richtextEditorOptions.isFocus = false;
    },

    // 记录上一次的选区位置
    setLastRangeRecord() {
      let selection = window.getSelection();
      // 保存最后的range对象
      this.lastRangeRecord = Object.freeze(selection?.getRangeAt(0));
    },

    // h5 dataset设置和获取值
    setElementDataset(target, name, value) {
      if (target.dataset) {
        target.dataset[name] = value;
      } else {
        target.setAttribute(`data-${name}`, value);
      }
    },
    getElementDataset(target, name) {
      if (target.dataset) {
        return target.dataset[name];
      }

      return target.getAttribute(`data-${name}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.my-richtext {
  width: 500px;
  height: 100px;
  user-select: text;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  border: 1px solid red;
  background: rgb(176, 185, 149);
  padding: 5px;

  &:empty:before {
    content: attr(placeholder);
    display: block;
    color: #666;
  }

  .editor-node {
    color: blue;
  }
}
</style>
