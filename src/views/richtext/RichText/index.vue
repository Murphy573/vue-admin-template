<template>
  <div class="richtext-container" v-clickoutside="handleClickoutside">
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
      @click="handleClick"></div>

    <el-button @click="handleClickAtBtn">@</el-button>
    {{ atMembersOptions.visible }}
    <AtMembers
      :visible.sync="atMembersOptions.visible"
      :pos="caretPos"
      :searchKeyword="richtextEditorOptions.filterText"
      @on-cancel-select="handleCancelMemberSelect"
      @on-select="handleMemberSelect" />
  </div>
</template>

<script>
import AtMembers from './AtMembers.vue';
/**
 * TODO:
 * 1、
 */
export default {
  name: 'Richtext',

  components: { AtMembers },

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
        editingNode: null,
        filterText: '',
      },
      // 记录上一次的选区位置
      lastRangeRecord: null,
      atMembersOptions: {
        visible: false,
      },
      // 光标位置
      caretPos: { x: 0, y: 0 },
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
    handleMemberSelect(member, trigger) {
      const atNode = this.createPlaceholderNode({
        identifier: '@',
        identifierAlsoEnd: true,
        canEdit: false,
        content: member.name,
      });

      this.setElementDataset(atNode, 'memberInfo', JSON.stringify(member));

      this.replacePlaceholderNode2Annother({
        content: atNode,
        insertEmpty: true,
      });
      trigger !== 'click' && this.setLastRangeRecord();
    },
    handleCancelMemberSelect(isRecordRange = true) {
      this.atMembersOptions.visible = false;
      this.replacePlaceholderNode2Annother({
        identifier: '@',
        content: this.richtextEditorOptions.filterText || '',
      });
      isRecordRange && this.setLastRangeRecord();
    },
    handleClickAtBtn() {
      // BUGFIX: 解决连续点击@按钮出现连续的node
      this.handleCancelMemberSelect(false);
      this.setRichtextEditorFocus();

      // 没有range记录则是首次编辑，直接将光标移至末尾
      const placeholderNode = this.createPlaceholderNode({
        identifier: '@',
        canEdit: true,
      });
      if (!this.lastRangeRecord) {
        this.richtextEditor.appendChild(placeholderNode);
        this.moveCaret2StartOrEnd('end');
      } else {
        // 有range记录则不是首次编辑
        const sel = window.getSelection();
        sel.removeAllRanges();
        // 先复原记录的选区
        sel.addRange(this.lastRangeRecord);
        this.insertContentOnCaret({ content: placeholderNode });
        // 记录最新选区
        this.setLastRangeRecord();
      }
      this.richtextEditorOptions.editingNode = placeholderNode;
      this.$nextTick(() => {
        this.syncCaretPos();
        this.atMembersOptions.visible = true;
      });
    },

    setRichtextEditorFocus() {
      this.richtextEditor?.focus();
      this.richtextEditorOptions.isFocus = true;
    },

    // 在光标处插入内容
    insertContentOnCaret({ content = '' }) {
      this.setRichtextEditorFocus();

      let sel = window.getSelection();
      if (typeof content === 'string') {
        content = document.createTextNode(content);
      }
      if (sel.getRangeAt && sel.rangeCount) {
        let range = sel.getRangeAt(0);
        range.deleteContents();

        range.insertNode(content);
        if (content) {
          range = range.cloneRange();
          range.setStartAfter(content);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
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

    // 同步光标在容器内的坐标
    syncCaretPos() {
      if (!this.richtextEditor) return;
      const { x, y } = this.getCaretCoordsOfDocument();
      const { top, left } = this.richtextEditor.getBoundingClientRect();

      this.caretPos = {
        x: x - top,
        y: y - left,
      };
    },

    // 获取光标在整个文档内的坐标
    getCaretCoordsOfDocument() {
      let win = window;
      let doc = win.document;
      let sel = doc.selection;
      let range;
      let rects;
      let rect;
      let x = 0;
      let y = 0;
      if (sel) {
        if (sel.type !== 'Control') {
          range = sel.createRange();
          range.collapse(true);
          x = range.boundingLeft;
          y = range.boundingTop;
        }
      } else if (win.getSelection) {
        sel = win.getSelection();
        if (sel.rangeCount) {
          range = sel.getRangeAt(0).cloneRange();
          if (range.getClientRects) {
            range.collapse(true);
            rects = range.getClientRects();
            if (rects.length > 0) {
              rect = rects[0];
            }
            // 光标在行首时，rect为undefined
            if (rect) {
              x = rect.left;
              y = rect.top;
            }
          }
          // Fall back to inserting a temporary element
          if ((x === 0 && y === 0) || rect === undefined) {
            let span = doc.createElement('span');
            if (span.getClientRects) {
              // Ensure span has dimensions and position by
              // adding a zero-width space character
              span.appendChild(doc.createTextNode('\u200b'));
              range.insertNode(span);
              rect = span.getClientRects()[0];
              x = rect.left;
              y = rect.top;
              let spanParent = span.parentNode;
              spanParent.removeChild(span);

              // Glue any broken text nodes back together
              spanParent.normalize();
            }
          }
        }
      }
      return { x, y };
    },

    /**
     * 创建占位节点
     */
    createPlaceholderNode({
      identifier = '@',
      content = '',
      canEdit = true,
      identifierAlsoEnd = false,
    }) {
      const font = document.createElement('font');
      font.setAttribute('class', 'editor-node');
      font.setAttribute('contenteditable', canEdit ? 'true' : 'false');
      font.innerText = ` ${identifier}${content}${
        identifierAlsoEnd ? identifier : ''
      } `;

      return font;
    },

    // 替换当前正在编辑的节点为其他节点
    replacePlaceholderNode2Annother({
      content,
      identifier = '@',
      insertEmpty = false,
    }) {
      const editingNode = this.richtextEditorOptions.editingNode;
      if (!this.richtextEditor || !editingNode) return;

      let newTextNode = content;
      if (typeof content === 'string') {
        newTextNode = document.createTextNode(`${identifier}${content}`);
      }
      if (this.richtextEditor.contains(editingNode)) {
        this.richtextEditor.insertBefore(newTextNode, editingNode);
        this.richtextEditor.removeChild(editingNode);
      }
      this.richtextEditorOptions.editingNode = null;
      this.richtextEditorOptions.filterText = '';
      // 是否追加0宽节点
      if (insertEmpty) {
        const emptyNode = document.createTextNode('\u200b');
        this.insertContentOnCaret({ content: emptyNode });
        this.setRichtextEditorFocus();
      }
    },

    // 当点击编辑器时
    handleClick(event) {
      const target = event.target;
      // 如果存在可编辑节点，则始终将光标放在可编辑节点最后
      if (this.richtextEditorOptions.editingNode) {
        const sel = window.getSelection();
        const range = sel?.getRangeAt(0);
        range?.setStartAfter(this.richtextEditorOptions.editingNode);
      } else {
        // 当点击的不可编辑节点，则将光标移动到该节点之后
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
          range.setStartAfter(newTextNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        // 记录上一次的选区位置
        this.setLastRangeRecord();
      }
    },

    handleKeyup() {
      // 记录上一次的选区位置
      // this.setLastRangeRecord();
    },

    handleFocus() {
      // eslint-disable-next-line no-console
      console.log('handleFocus');
    },

    // 丢失焦点
    handleBlur() {
      if (this.atMembersOptions.visible) return;
      this.richtextEditorOptions.isFocus = false;
      this.handleCancelMemberSelect();
    },

    // 点击容器外
    handleClickoutside() {
      this.richtextEditorOptions.isFocus = false;
      this.handleCancelMemberSelect(false);
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
.richtext-container {
  position: relative;
  width: max-content;
  height: max-content;
}
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
}
</style>
<style lang="scss">
.my-richtext {
  .editor-node {
    color: blue;
  }
}
</style>
