<template>
  <div
    ref="richtextRef"
    class="my-richtext"
    :placeholder="placeholder"
    tabindex="0"
    spellcheck="true"
    contenteditable="true"
    @focus="handleFocus"
    @blur="handleBlur"
    @keydown="handleKeydown"
    @keyup="handleKeyup"
    @click="handleClick"></div>
</template>

<script>
const ZeroWidthSpace = '\u200B';

export default {
  name: 'Richtext',

  props: {
    placeholder: {
      type: String,
      default: '输入文案...',
    },
    maxlength: {
      type: Number,
      default: Infinity,
    },
    // 触发关键字
    identifierOptions: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      richtextEditor: null,
      richtextEditorOptions: {
        isFocus: false,
        editingNode: null,
        filterText: '',
        filterTextPattern: null,
        // 当前正在触发哪个关键按键
        currentIndentifier: '',
      },
      // 记录上一次的选区位置
      lastRangeRecord: null,
      // @ at用户
      atMembersOptions: {
        visible: false,
      },
      // 光标位置
      caretPos: { x: 0, y: 0 },
      // 当选择面板打开时，禁用的按键
      preventDefaultKeysOnPanelVisible: [
        'ArrowUp',
        'ArrowDown',
        'Enter',
        'Tab',
      ],
    };
  },

  computed: {
    isExceedMaxlength() {
      return false;
    },
    genAllIdentifierOptionsMap() {
      const map = {};

      this.identifierOptions.forEach((item) => {
        map[item.key] = item;
      });

      return map;
    },
    genAllIdetifiers() {
      return Object.keys(this.genAllIdentifierOptionsMap);
    },
    // 是否处于关键字触发编辑
    isTriggerEditing() {
      const { editingNode, currentIndentifier } = this.richtextEditorOptions;
      return !!editingNode && !!currentIndentifier;
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.richtextEditor = this.$refs.richtextRef || null;

      if (!this.richtextEditor) return;
    });
  },

  methods: {
    // 关键词触发的选中：外部调用
    handleConfirmTrigger({
      identifier,
      data,
      contentKey,
      identifierAlsoEnd,
      trigger,
    }) {
      const currentIndentifierOption =
        this.genAllIdentifierOptionsMap[identifier];
      if (!currentIndentifierOption) {
        this.handleCancelTrigger(this.richtextEditorOptions.currentIndentifier);
        return;
      }

      const atNode = this.createPlaceholderNode({
        identifier,
        identifierAlsoEnd: !!identifierAlsoEnd,
        canEdit: false,
        content: data[contentKey],
      });

      this.setElementDataset(atNode, 'identifier', identifier);
      this.setElementDataset(
        atNode,
        currentIndentifierOption.datasetKey,
        JSON.stringify(data)
      );

      this.replacePlaceholderNode2Annother({
        content: atNode,
        insertEmpty: true,
      });
      this.resetRichtextEditorOptions();
      this.setLastRangeRecord();
    },

    // 关键词触发的取消：
    handleCancelTrigger(identifier, isRecordRange = true) {
      if (identifier) {
        this.replacePlaceholderNode2Annother({
          identifier,
          content: this.richtextEditorOptions.filterText || '',
        });
      }

      isRecordRange && this.setLastRangeRecord();
      this.resetRichtextEditorOptions();

      !!identifier && this.$emit('on-cancel-trigger', identifier);
    },
    // 外部主动触发
    handleTrigger(identifier) {
      // BUGFIX: 解决连续点击关键按钮出现连续的node
      if (this.isTriggerEditing) {
        this.handleCancelTrigger(
          this.richtextEditorOptions.currentIndentifier,
          false
        );
      }
      if (!this.genAllIdentifierOptionsMap[identifier]) return;

      this.setRichtextEditorFocus();

      // 创建编辑占位符
      const placeholderNode = this.createPlaceholderNode({
        identifier,
        canEdit: true,
      });

      // 没有range记录则是首次编辑，直接将光标移至末尾
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
      // 设置编辑器记录数据
      this.richtextEditorOptions = {
        editingNode: Object.freeze(placeholderNode),
        currentIndentifier: identifier,
        filterTextPattern: new RegExp(`${identifier}([^${identifier}\\s]*)$`),
        filterText: '',
      };
      this.$nextTick(() => {
        this.syncCaretPos();
        this.$emit('on-trigger', this.richtextEditorOptions.currentIndentifier);
      });
    },

    // 设置搜索关键词
    setFilterText(text) {
      const match = this.richtextEditorOptions.filterTextPattern?.exec?.(
        text || ''
      );
      if (match && match.length === 2) {
        this.richtextEditorOptions.filterText = match[1];
        this.$emit('on-search', match[1]);
      }
    },

    // 重置编辑器记录数据
    resetRichtextEditorOptions() {
      this.richtextEditorOptions = {
        currentIndentifier: '',
        editingNode: null,
        filterText: '',
        filterTextPattern: null,
      };
    },

    setRichtextEditorFocus() {
      this.richtextEditor?.focus();
      this.richtextEditorOptions.isFocus = true;
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
      // 编辑时，content左右插入0宽节点
      const text = `${identifier}${canEdit ? ZeroWidthSpace : ''}${content}${
        canEdit ? ZeroWidthSpace : ''
      }${identifierAlsoEnd ? identifier : ''}`;
      const textNode = document.createTextNode(canEdit ? text : ` ${text} `);
      font.appendChild(textNode);

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
      // 是否追加0宽节点
      if (insertEmpty) {
        const emptyNode = document.createTextNode(ZeroWidthSpace);
        this.insertContentOnCaret({ content: emptyNode });
        this.setRichtextEditorFocus();
      }
    },

    // 当点击编辑器时
    handleClick(event) {
      const target = event.target;
      // 如果存在可编辑节点，则始终将光标放在可编辑节点最后
      if (this.isTriggerEditing) {
        const sel = window.getSelection();
        const range = sel?.getRangeAt(0);
        range?.setStartAfter(
          this.richtextEditorOptions.editingNode.childNodes[0]
        );
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

    handleKeydown(event) {
      const { key } = event;
      // 当触发了关键字
      if (this.isTriggerEditing) {
        // 按下这几个键时，禁用默认行为
        if (this.preventDefaultKeysOnPanelVisible.includes(key)) {
          event.preventDefault();
        } else {
          // 当按下配置的关键字按键或者空格，完成本次输入
          if (this.genAllIdetifiers.includes(key) || key === ' ') {
            this.handleCancelTrigger(
              this.richtextEditorOptions.currentIndentifier
            );
          }
        }
      } else {
        // 达到最大输入长度，且不是删除，禁止输入
        if (this.isExceedMaxlength && key !== 'Backspace') {
          event.preventDefault();
        } else if (key === 'Enter') {
          event.preventDefault();
          // ctrl键提交
          // if (event.metaKey || event.ctrlKey) {
          //   if (this.editor?.innerHTML && !this.exceedMax) {
          //     this.$emit('on-enter', event);
          //     this.clearEditor();
          //   }
          // } else {
          // }
          // TODO: 未解决有字符需要按下两次回车才会换行
          const selection = getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const startOffset = range?.startOffset || 0;
            const endOffset = range?.endOffset || 0;
            this.pasteHtml('<br/>', startOffset, endOffset);
            // this.caculateSrcollHeight();
          }
        }
      }
    },

    handleKeyup(event) {
      const { key } = event;
      if (!key) return;
      // 获取选定对象
      const selection = window.getSelection();
      if (!selection?.isCollapsed) return;
      this.setLastRangeRecord();
      if (key === 'Escape' && !this.isTriggerEditing) {
        this.$emit('esc', event);
      } else if (
        !this.genAllIdetifiers.includes(key) &&
        !this.isTriggerEditing
      ) {
        // 当输入字符为 @ 时展示浮窗，根据最后一个 @ 后的字符筛选成员列表，无成员时浮窗隐藏
        // 当最后的节点为高亮节点时，会有指针位置紊乱的问题，在生成高亮节点时通过尾部加上空格规避，删除空格时连带高亮节点一起删除
        if (!this.richtextEditor) return;
        // 输入空格再删除时有可能会有空节点遗留，判断时过滤掉textContent为空的节点
        const childNodes = [...this.richtextEditor.childNodes].filter(
          (item) => !!item.textContent
        );
        if (childNodes?.length) {
          const total = childNodes.length;
          const lastNode = childNodes[total - 1];
          if (lastNode?.className === 'editor-node') {
            this.richtextEditor.removeChild(lastNode);
          }
        }
        // TODO: 计算内容
        // this.getEditorContent();
        return;
      } else if (this.genAllIdetifiers.includes(key)) {
        if (this.isExceedMaxlength) return;
        // 拿到记录的对象
        const lastRange = this.lastRangeRecord;
        // 删除关键字
        this.deleteHtml(
          lastRange.startOffset - 1 > 0 ? lastRange.startOffset - 1 : 0,
          lastRange.endOffset
        );
        // 触发关键字选择
        this.handleTrigger(key);
        const range = lastRange.cloneRange();
        range.deleteContents();
        // 设置光标到编辑节点
        range.insertNode(this.richtextEditorOptions.editingNode);
        // 3是指关键字节点里的0宽节点中间
        // text节点
        range.setStart(this.richtextEditorOptions.editingNode.childNodes[0], 2);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        // 记录节点
        this.setLastRangeRecord();
      } else if (this.isTriggerEditing) {
        // 如果是@编辑状态，则删除分隔符时删除整个编辑区域

        if (key === 'Backspace') {
          const anchorNode = selection.anchorNode;
          const firstSperator =
            anchorNode?.textContent?.indexOf(ZeroWidthSpace) || 0;
          const lastSperator =
            anchorNode?.textContent?.lastIndexOf(ZeroWidthSpace) || 0;
          if (firstSperator >= lastSperator) {
            this.handleCancelTrigger(
              this.richtextEditorOptions.currentIndentifier
            );
            return;
          }
        }

        // 左右移动光标、ESC退出@编辑模式
        if (
          [
            'ArrowLeft',
            'ArrowRight',
            //  'ArrowUp', 'ArrowDown' // 输入法上下选择冲突
          ].indexOf(key) >= 0
        ) {
          this.handleCancelTrigger(
            this.richtextEditorOptions.currentIndentifier
          );
          return;
        }

        // 设置搜索
        this.setFilterText(selection?.['anchorNode']?.textContent || '');
      }
    },

    handleFocus() {
      // eslint-disable-next-line no-console
      console.log('handleFocus');
    },

    // 丢失焦点
    handleBlur() {
      if (this.isTriggerEditing) return;
      this.richtextEditorOptions.isFocus = false;
    },

    // 点击容器外
    handleClickoutside() {
      this.richtextEditorOptions.isFocus = false;
      this.handleCancelTrigger(
        this.richtextEditorOptions.currentIndentifier,
        false
      );
      // 将光标移动到最后面
      // this.moveCaret2StartOrEnd('end');
      // this.setLastRangeRecord();
      // this.richtextEditor?.blur();
    },

    // 记录上一次的选区位置
    setLastRangeRecord() {
      let selection = window.getSelection();
      // 保存最后的range对象
      this.lastRangeRecord = Object.freeze(selection?.getRangeAt(0));
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
        x: x - left,
        y: y - top + 24,
      };

      this.$emit('on-sync-caret-pos', { ...this.caretPos });
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

    deleteHtml(startPos, endPos, node = null) {
      let sel = window.getSelection();
      let range = document.createRange();
      if (!range || !sel) return;
      let anchorNode = node ? node : sel.anchorNode;
      range.setStart(anchorNode, startPos);
      range.setEnd(anchorNode, endPos);
      range.deleteContents();
    },

    pasteHtml(html, startPos, endPos, node = null) {
      let sel = window.getSelection();
      let range = document.createRange();
      if (!range || !sel) return;
      let anchorNode = node ? node : sel.anchorNode;
      range.setStart(anchorNode, startPos);
      range.setEnd(anchorNode, endPos);
      range.deleteContents();

      let el = document.createElement('div');
      el.innerHTML = html;
      let frag = document.createDocumentFragment();
      let curNode;
      let lastNode;
      while ((curNode = el.firstChild)) {
        lastNode = frag.appendChild(curNode);
      }
      range.insertNode(frag);
      if (lastNode) {
        range = range.cloneRange();
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      this.lastEditRange = range;
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
