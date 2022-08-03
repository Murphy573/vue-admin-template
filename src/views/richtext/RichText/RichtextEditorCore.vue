<template>
  <div
    v-clickoutside:[clickoutsideMergedKey]="handleClickoutside"
    :class="genWrapperStyle.class"
    :style="genWrapperStyle.style"
    @contextmenu.prevent>
    <div
      ref="richtextRef"
      class="my-richtext"
      :class="genEditorStyle.class"
      :style="genEditorStyle.style"
      :placeholder="placeholder"
      tabindex="0"
      spellcheck="true"
      contenteditable="true"
      @keydown="handleKeydown"
      @keyup="handleKeyup"
      @click="handleClick"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      @paste="handlePaste"></div>
    maxlength:{{ maxlength }},contentLength:{{
      richtextEditorOptions.contentLength
    }},richtextEditorOptions.isFocus:{{ richtextEditorOptions.isFocus }}
  </div>
</template>

<script>
import {
  setElementDataset,
  getElementDataset,
  getCaretCoordsOfDocument,
  moveCaret2StartOrEnd,
  clearZeroWidthSpace,
  ZeroWidthSpaceChar,
  judgeNodeCannotEditable,
  insertHtmlByRange,
  deleteHtmlByRange,
  EditableNodeTextPattern,
} from './util';
import { isPlainObj, isDef } from '@/utils/common.js';

const debug = require('debug')('ve:RichtextEditorCore');

export default {
  name: 'RichtextEditorCore',

  props: {
    placeholder: {
      type: String,
      default: '输入文案...',
    },
    maxlength: {
      type: Number,
      default: Number.MAX_SAFE_INTEGER,
    },
    // 是否可以换行
    isCanLF: {
      type: Boolean,
      default: true,
    },
    // 触发关键字
    identifierOptions: {
      type: Array,
      default: () => [],
    },
    // 计算出来的光标在容器内的偏移量
    caretPosOffset: {
      type: Object,
      default: () => ({ x: 0, y: 24 }),
    },
    // 光标位置是否基于容器
    isCaretPosByContainer: {
      type: Boolean,
      default: false,
    },
    // 高亮标签配置：要么在identifierOptions配置，要么在当前位置配置组件全局的
    highlightTagOption: {
      type: Object,
      // 都支持以下属性
      default: () => ({
        tag: 'font',
        className: 'editor-node',
        attribute: {},
      }),
    },
    // 最外层容器的样式
    wrapperStyle: {
      type: Object,
      default: () => ({ className: '', style: {} }),
    },
    // 编辑器元素的样式
    editorStyle: {
      type: Object,
      default: () => ({ className: '', style: {} }),
    },
    // 计数元素的样式
    countStyle: {
      type: Object,
      default: () => ({ className: '', style: {} }),
    },
    // 是否展示计数元素
    showCount: {
      type: Boolean,
      default: true,
    },
    // 点击元素外合并关键字：该参数用于解决点击目标元素外关闭触发或者外部按钮触发的场景
    clickoutsideMergedKey: {
      type: String,
      default: 'RichtextCore',
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
        // 输入的内容长度
        contentLength: 0,
      },
      // 输入法输入选项
      compositionOptions: {
        // 是否正在输入
        isInputing: false,
        // 输入法确认后的长度
        contentLength: 0,
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
      // 删除键
      deleteKeys: ['Backspace', 'Delete'],
      // 方向键键
      arrowKeys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
    };
  },

  computed: {
    isExceedMaxlength() {
      return this.richtextEditorOptions.contentLength >= this.maxlength;
    },
    genAllIdentifierOptionsMap() {
      const map = this.identifierOptions.reduce((prev, next) => {
        const item = { ...next };
        // 不传则为1
        item.contentLength = item.contentLength || 1;

        prev[item.identifier] = item;
        return prev;
      }, {});

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
    genWrapperStyle() {
      return {
        class: this.wrapperStyle.className?.split(' ') || [],
        style: this.wrapperStyle.style || {},
      };
    },
    genEditorStyle() {
      return {
        class: this.editorStyle.className?.split(' ') || [],
        style: this.editorStyle.style || {},
      };
    },
    genCountStyle() {
      return {
        class: this.countStyle.className?.split(' ') || [],
        style: this.countStyle.style || {},
      };
    },
  },

  methods: {
    // 关键词触发的选中：外部调用
    confirmIdentifierSelect({ identifier, data, contentKey }) {
      const currentIndentifierOption =
        this.genAllIdentifierOptionsMap[identifier];
      if (!currentIndentifierOption) {
        this.cancelIdentifierSelect(
          this.richtextEditorOptions.currentIndentifier
        );
        return;
      }

      const placeholderNode = this.createPlaceholderNode({
        identifier,
        canEdit: false,
        content: data[contentKey],
      });

      setElementDataset(placeholderNode, 'identifier', identifier);
      setElementDataset(
        placeholderNode,
        currentIndentifierOption.datasetKey,
        JSON.stringify(data)
      );

      this.replacePlaceholderNode2Annother({
        content: placeholderNode,
        insertEmpty: true,
      });
      this.resetRichtextEditorOptions();
      this.setLastRangeRecord();
      // 转换输入内容
      this.genEditorInputContent();
    },

    // 关键词触发的取消：
    cancelIdentifierSelect(identifier, isRecordRange = true) {
      if (!this.isTriggerEditing) return;
      if (identifier) {
        this.replacePlaceholderNode2Annother({
          identifier,
          content: this.richtextEditorOptions.filterText || '',
        });
      }

      isRecordRange && this.setLastRangeRecord();
      this.resetRichtextEditorOptions();

      !!identifier && this.$emit('on-cancel-identifier-select', identifier);
    },

    // 主动触发选择
    openIdentifierSelect(identifier) {
      if (this.isTriggerEditing) {
        this.cancelIdentifierSelect(
          this.richtextEditorOptions.currentIndentifier,
          false
        );
      }

      if (this.isExceedMaxlength) return;
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
        moveCaret2StartOrEnd(this.richtextEditor, 'end');
      } else {
        // 有range记录则不是首次编辑
        const sel = window.getSelection();
        sel.removeAllRanges();
        // 先复原记录的选区
        sel.addRange(this.lastRangeRecord);
        this.insertHtml(placeholderNode);
        // 记录最新选区
        this.setLastRangeRecord();
      }
      // 设置编辑器记录数据
      Object.assign(this.richtextEditorOptions, {
        editingNode: Object.freeze(placeholderNode),
        currentIndentifier: identifier,
        filterTextPattern: new RegExp(`${identifier}([^${identifier}\\s]*)$`),
        filterText: '',
      });
      this.$nextTick(() => {
        this.syncCaretPos();
        this.$emit(
          'on-open-identifier-select',
          this.richtextEditorOptions.currentIndentifier
        );
      });
    },

    // 设置搜索关键词
    setFilterText(text) {
      text = clearZeroWidthSpace(text);

      const match = this.richtextEditorOptions.filterTextPattern?.exec?.(
        text || ''
      );

      let filterText = '';
      if (match && match.length === 2) {
        filterText = match[1];
        this.richtextEditorOptions.filterText = filterText;
        this.$emit('on-identifier-search', filterText);
      } else {
        this.$emit('on-identifier-search', filterText);
      }

      // 如果输入的内容不有不允许的字符，退出编辑
      if (filterText && !EditableNodeTextPattern.test(filterText)) {
        this.cancelIdentifierSelect(
          this.richtextEditorOptions.currentIndentifier
        );
      }
    },

    // 重置编辑器记录数据
    resetRichtextEditorOptions() {
      this.richtextEditorOptions = {
        currentIndentifier: '',
        editingNode: null,
        filterText: '',
        filterTextPattern: null,
        isFocus: this.richtextEditorOptions.isFocus,
        contentLength: 0,
      };
      this.setFilterText('');
    },

    // 主动获得编辑器焦点
    setRichtextEditorFocus() {
      if (this.richtextEditorOptions.isFocus) return;
      this.richtextEditor?.focus();
      this.richtextEditorOptions.isFocus = true;
    },

    /**
     * 创建占位节点
     */
    createPlaceholderNode({ identifier = '@', content = '', canEdit = true }) {
      const currentIndentifierOption =
        this.genAllIdentifierOptionsMap[identifier];

      // 高亮节点配置
      const {
        tag = 'span',
        className = 'editor-node',
        attribute = {},
      } = currentIndentifierOption.highlightTagOption ||
      this.highlightTagOption;

      const ele = document.createElement(tag);
      // 设置类名
      ele.setAttribute('class', className);
      // 设置属性
      ele.setAttribute('contenteditable', canEdit ? 'true' : 'false');
      ele.setAttribute('tabindex', '-1');
      if (isPlainObj(attribute)) {
        Object.keys(attribute).forEach((key) => {
          ele.setAttribute(key, attribute[key]);
        });
      }
      const { insertPosition = 'start' } = currentIndentifierOption;

      // 设置innerText
      let text = content;
      // 编辑时，content左右插入0宽节点
      if (canEdit) {
        text = identifier + ZeroWidthSpaceChar + content + ZeroWidthSpaceChar;
      } else {
        // 根据配置的标识位置动态拼接
        if (insertPosition === 'start') {
          text = identifier + text;
        } else if (insertPosition === 'surround') {
          text = identifier + text + identifier;
        }
        // 不可编辑前方插入空格
        text = ` ${text} `;
      }

      const textNode = document.createTextNode(text);
      ele.appendChild(textNode);

      return ele;
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
        let text = '';
        // 取消时是否包含标识符
        const { hasIdentifierOnCancel } =
          this.genAllIdentifierOptionsMap[identifier];

        if (isDef(hasIdentifierOnCancel) && !hasIdentifierOnCancel) {
          text = content;
        } else {
          text = `${identifier}${content}`;
        }
        // 消除0宽节点
        newTextNode = document.createTextNode(clearZeroWidthSpace(text));
      }
      if (this.richtextEditor.contains(editingNode)) {
        this.richtextEditor.insertBefore(newTextNode, editingNode);
        this.richtextEditor.removeChild(editingNode);
      }
      // 是否追加0宽占位符
      if (insertEmpty) {
        const emptyNode = document.createTextNode(ZeroWidthSpaceChar);
        this.insertHtml(emptyNode);
        this.setRichtextEditorFocus();
      }
    },

    // 当点击编辑器时
    handleClick(event) {
      this.setRichtextEditorFocus();

      const target = event.target;
      // 如果存在可编辑节点，则始终将光标放在可编辑节点最后一个0宽字符前面：保证删除时判断正常取消触发
      if (this.isTriggerEditing) {
        const sel = window.getSelection();
        const textNode = this.richtextEditorOptions.editingNode.childNodes[0];
        const range = document.createRange();
        range.setStart(textNode, textNode?.textContent.length - 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        // 当点击的不可编辑节点
        if (judgeNodeCannotEditable(target)) {
          // 因为手动插入了空节点，所以取下一个
          let nextEle = target.nextSibling;
          const sel = window.getSelection();
          const range = document.createRange();
          const newTextNode = document.createTextNode('');

          // 下个节点不存在，插入新节点
          if (!nextEle) {
            this.richtextEditor?.appendChild(newTextNode);
            range.setStartBefore(newTextNode);
          } else {
            // 下个节点不可编辑，则在下个节点前插入一个text节点
            if (judgeNodeCannotEditable(nextEle)) {
              newTextNode.textContent = ZeroWidthSpaceChar;
              this.richtextEditor.insertBefore(newTextNode, nextEle);
              range.setStart(newTextNode, 1);
            } else {
              const nextEleContent = nextEle.textContent;
              // 下个节点内容的首字符是否是0宽字符
              if (!/^[\u200B-\u200D\uFEFF]$/g.test(nextEleContent.charAt(0))) {
                range.setStart(nextEle, 0);
              } else {
                range.setStart(nextEle, 1);
              }
            }
          }

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
        // 输入法输入不走下面的逻辑
        if (this.compositionOptions.isInputing) return;
        // 按下这几个键时，禁用默认行为
        if (this.preventDefaultKeysOnPanelVisible.includes(key)) {
          event.preventDefault();
        } else {
          // 当按下配置的关键字按键或者空格，完成本次输入
          if (this.genAllIdetifiers.includes(key) || key === ' ') {
            this.cancelIdentifierSelect(
              this.richtextEditorOptions.currentIndentifier
            );
          }
        }
      } else {
        // 达到最大输入长度，且不是删除，禁止输入
        if (this.isExceedMaxlength && !this.deleteKeys.includes(key)) {
          event.preventDefault();
        } else if (key === 'Enter') {
          event.preventDefault();
          // ctrl+enter键事件拦截
          if (event.metaKey || event.ctrlKey) {
            if (this.richtextEditor?.innerHTML && !this.isExceedMaxlength) {
              this.$emit('on-enter', event);
            }
            return;
          }

          if (!this.isCanLF) return;
          // 换行
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const startOffset = range?.startOffset || 0;
            const endOffset = range?.endOffset || 0;
            // NOTE: br添加0宽节点，解决有字符需要按下两次回车才会换行的问题
            this.insertHtml(
              `<br/>${ZeroWidthSpaceChar}`,
              startOffset,
              endOffset,
              range.startContainer,
              range.endContainer
            );
            this.caculateSrcollHeight();
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
        this.$emit('on-escape', event);
      } else if (
        !this.genAllIdetifiers.includes(key) &&
        !this.isTriggerEditing
      ) {
        if (!this.richtextEditor) return;

        // 当删除占位符号时，连带不可编辑节点一起删除
        if (this.deleteKeys.includes(key)) {
          this.handleDelete();
        }

        // 方向键光标处理
        if (this.arrowKeys.includes(key)) {
          this.handleArrowKeyEvent(key);
        }

        // 转换输入内容
        this.genEditorInputContent();
        return;
      } else if (this.genAllIdetifiers.includes(key)) {
        if (this.isExceedMaxlength) return;
        // 拿到记录的对象
        const lastRange = this.lastRangeRecord;
        // 删除关键字
        deleteHtmlByRange(
          lastRange.startOffset - 1 > 0 ? lastRange.startOffset - 1 : 0,
          lastRange.endOffset
        );
        // 触发关键字选择
        this.openIdentifierSelect(key);
        const range = lastRange.cloneRange();
        range.deleteContents();
        // 设置光标到编辑节点
        range.insertNode(this.richtextEditorOptions.editingNode);
        // 2是指关键字节点里的0宽节点中间
        // text节点
        range.setStart(this.richtextEditorOptions.editingNode.childNodes[0], 2);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        // 记录节点
        this.setLastRangeRecord();
      } else if (this.isTriggerEditing) {
        // 输入法输入中不走下面的逻辑
        if (this.compositionOptions.isInputing) return;

        // 如果是@编辑状态，则删除分隔符时删除整个编辑区域
        if (this.deleteKeys.includes(key)) {
          const anchorNode = selection.anchorNode;
          const firstSperator =
            anchorNode?.textContent?.indexOf(ZeroWidthSpaceChar) || 0;
          const lastSperator =
            anchorNode?.textContent?.lastIndexOf(ZeroWidthSpaceChar) || 0;
          if (firstSperator >= lastSperator) {
            this.cancelIdentifierSelect(
              this.richtextEditorOptions.currentIndentifier
            );
            return;
          }
        }

        // 左右移动光标
        if (['ArrowLeft', 'ArrowRight'].includes(key)) {
          this.cancelIdentifierSelect(
            this.richtextEditorOptions.currentIndentifier
          );
          return;
        }

        // 设置搜索
        this.setFilterText(selection?.['anchorNode']?.textContent || '');
      }
    },

    /**
     * #### 当删除占位符号时，连带不可编辑节点一起删除
     * ##### 删除处理： 遍历子节点
     *  - 如果当前节点是不可编辑节点：则看前一个节点是否是不可编辑节点，如果不可编辑，则将前一个节点删掉
     *  - 如果当前节点是可编辑节点：则看前一个节点是否是不可编辑节点
     *      - 如果前一个节点不可编辑，且当前节点首字符不是占位符，则将前一个节点删掉
     *      - 如果前一个节点可编辑，则将当前元素的首字符（占位符）清除
     *  - 边界条件：首节点是可编辑节点，则清除占位符；尾节点是不可编辑节点，则删除；
     */
    handleDelete() {
      const childNodes = [...this.richtextEditor.childNodes].filter((item) => {
        return !!item.textContent || item.nodeName === 'BR';
      });
      const willDeleteNodes = [];

      childNodes.forEach((curNode, index) => {
        const isCurNodeCannotEditable = judgeNodeCannotEditable(curNode);
        const curNodeTextContent = curNode.textContent || '';
        const isCurNodeFisrtCharIsZeroWidthSpace =
          /^[\u200B-\u200D\uFEFF]$/g.test(curNodeTextContent.charAt(0));

        if (index === 0) {
          if (!isCurNodeCannotEditable) {
            // 如果当前节点包含0宽占位节点，才会进行清除操作，解决向后删除时光标闪烁问题
            if (isCurNodeFisrtCharIsZeroWidthSpace) {
              curNode.textContent = clearZeroWidthSpace(curNodeTextContent);
            }
          } else {
            // 字节点仅存在一个不可编辑的节点
            if (index === childNodes.length - 1) {
              willDeleteNodes.push(curNode);
            }
          }
          return;
        }

        const prevNode = childNodes[index - 1];
        const isPrevNodeCannotEditable = judgeNodeCannotEditable(prevNode);

        if (isCurNodeCannotEditable) {
          if (isPrevNodeCannotEditable) {
            willDeleteNodes.push(prevNode);
          }
        } else {
          if (isPrevNodeCannotEditable) {
            if (!isCurNodeFisrtCharIsZeroWidthSpace) {
              willDeleteNodes.push(prevNode);
            }
          } else {
            // 如果当前节点包含0宽占位节点，才会进行清除操作，解决向后删除时光标闪烁问题
            if (isCurNodeFisrtCharIsZeroWidthSpace) {
              curNode.textContent = clearZeroWidthSpace(curNodeTextContent);
            }
          }
        }

        // 最后一个节点是不可编辑也删除
        if (index === childNodes.length - 1 && isCurNodeCannotEditable) {
          willDeleteNodes.push(curNode);
        }
      });

      // 删除对应节点
      willDeleteNodes.forEach((node) => {
        this.richtextEditor.removeChild(node);
      });
    },

    /**
     * 方向键处理：处理光标上下左右移动时，会移动到0宽占位符节点前面的问题
     */
    handleArrowKeyEvent(key) {
      this.$nextTick(() => {
        if (!this.richtextEditor) return;

        const selection = window.getSelection();
        // 保存最后的range对象
        const range = selection?.getRangeAt(0);
        const caretOffset = range?.startOffset;
        // 如果光标不是闭合的，则不处理
        if (!range?.collapsed) return;

        const curNode = range?.startContainer;
        const curNodeTextContent = curNode.textContent || '';
        const isCaretBeforeZeroWidthSpace = /^[\u200B-\u200D\uFEFF]$/g.test(
          curNodeTextContent.charAt(caretOffset) || ''
        );

        if (!isCaretBeforeZeroWidthSpace) return;

        const childNodes = [...this.richtextEditor.childNodes].filter(
          (item) => {
            return !!item.textContent || item.nodeName === 'BR';
          }
        );

        const findIndex = childNodes.findIndex((node) => node === curNode);

        let newRange = range.cloneRange();

        // 向左移动光标
        if (key === 'ArrowLeft') {
          if (findIndex < 1) return;
          const prevNode = childNodes[findIndex - 1];
          const isPrevNodeCannotEditable = judgeNodeCannotEditable(prevNode);

          // 如果前一个节点是不可编辑的，则将光标移动到前前节点之后
          if (isPrevNodeCannotEditable) {
            const prevPrevNode = childNodes[findIndex - 2];

            if (prevPrevNode) {
              newRange.setStartAfter(prevPrevNode);
            } else {
              newRange.setStart(this.richtextEditor, 0);
            }
          }
        } else {
          // 向右移动光标
          if (findIndex > childNodes.length - 1) return;
          newRange.setStart(curNode, caretOffset + 1);
        }

        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      });
    },

    // 输入法输入开始
    handleCompositionStart() {
      this.compositionOptions.isInputing = true;
      if (!this.isTriggerEditing) {
        this.compositionOptions.contentLength =
          this.richtextEditorOptions.contentLength;
      }
    },

    // 输入法输入结束，event:CompositionEvent
    handleCompositionEnd(e) {
      let inputData = e.data || '';
      const compositionLength = this.compositionOptions.contentLength || 0;
      if (compositionLength + inputData.length > this.maxlength) {
        let newValueStr = inputData.slice(
          0,
          this.maxlength - compositionLength
        );
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startOffset = range?.startOffset || 0;
          this.insertHtml(
            newValueStr,
            startOffset - inputData.length,
            startOffset
          );
        }
      }
      this.compositionOptions.isInputing = false;
      this.compositionOptions.contentLength = 0;
    },

    // 处理粘贴事件
    handlePaste(e) {
      e.preventDefault();
      let paste = (e.clipboardData || window.clipboardData).getData('text');
      const {
        compositionOptions: { contentLength },
        maxlength,
      } = this;
      if (contentLength >= maxlength) {
        return false;
      } else if (contentLength + paste.length >= maxlength) {
        paste = paste.slice(0, maxlength - contentLength);
      }
      const selection = window.getSelection();
      if (!selection?.rangeCount) return false;
      const range = selection.getRangeAt(0);
      const startOffset = range?.startOffset || 0;
      const endOffset = range?.endOffset || 0;
      this.insertHtml(
        paste,
        startOffset,
        endOffset,
        range.startContainer,
        range.endContainer
      );
      this.caculateSrcollHeight();
      // 转换输入内容
      this.genEditorInputContent();
    },

    // 转换输入内容
    genEditorInputContent() {
      if (!this.richtextEditor) return;
      // 输入法输入时
      if (this.compositionOptions.isInputing) return;
      // 编辑器未聚焦时
      if (!this.richtextEditorOptions.isFocus) return;

      const texts = [];
      let contentLength = 0;
      let hasIdentifierNode = false;

      const childNodes = [...this.richtextEditor.childNodes].filter((item) => {
        return item.textContent || item.nodeName === 'BR';
      });

      const content = childNodes
        .map((item) => {
          if (item && item.nodeName === '#text') {
            const textContent = clearZeroWidthSpace(
              item?.textContent?.trim() || ''
            );
            texts.push(textContent);
            contentLength += textContent.length || 0;
            return {
              type: 'text',
              content: textContent,
            };
          } else if (item.nodeName === 'BR') {
            texts.push('\n');
            contentLength += 1;
            return {
              type: 'text',
              content: '\n',
            };
          } else {
            const identifier = getElementDataset(item, 'identifier');
            if (identifier) {
              hasIdentifierNode = true;
              const { datasetKey, contentLength: identifierContentLength } =
                this.genAllIdentifierOptionsMap[identifier];
              const identifierDataInfo = JSON.parse(
                getElementDataset(item, datasetKey)
              );
              contentLength += identifierContentLength;
              return {
                type: identifier,
                content: identifierDataInfo,
              };
            }
            return { type: 'unknown', content: 'unknown' };
          }
        })
        .filter((item) => {
          // 过滤掉unknown和content为空串的
          const isUnknown = item.type === 'unknown';
          const noContentText = item.type === 'text' && item.content === '';
          return !isUnknown && !noContentText;
        });

      if (contentLength > this.maxlength) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startOffset = range?.startOffset || 0;
          deleteHtmlByRange(
            startOffset - contentLength + this.maxlength,
            startOffset
          );
        }
        this.richtextEditorOptions.contentLength = this.maxlength;
      } else {
        this.richtextEditorOptions.contentLength = contentLength;
      }

      // eslint-disable-next-line no-console
      console.log('content', content);

      // 向外发送的数据
      const emitData = {
        contentLength: this.richtextEditorOptions.contentLength,
        contentData: !hasIdentifierNode ? texts.join('').trim() : content,
      };

      this.$emit('on-input-change', emitData);
    },

    // 点击容器外：是指包含输入节点、快捷插入节点等之外的节点
    handleClickoutside() {
      this.cancelIdentifierSelect(
        this.richtextEditorOptions.currentIndentifier,
        false
      );
      this.genEditorInputContent();
      this.richtextEditorOptions.isFocus = false;
      // 将光标移动到最后面
      moveCaret2StartOrEnd(this.richtextEditor, 'end');
      this.setLastRangeRecord();
      this.richtextEditor?.blur();
    },

    // 清空富文本内容
    clearRichtextContent() {
      if (!this.richtextEditor) return;
      this.richtextEditor.innerHTML = '';
    },

    // 记录上一次的选区位置
    setLastRangeRecord() {
      let selection = window.getSelection();
      // 保存最后的range对象
      this.lastRangeRecord = Object.freeze(selection?.getRangeAt(0));
    },

    // 同步光标在容器内的坐标
    syncCaretPos() {
      if (!this.richtextEditor) return;

      const { x, y } = getCaretCoordsOfDocument();

      let containerTop = 0;
      let containerLeft = 0;
      if (this.isCaretPosByContainer) {
        const containerRect = this.richtextEditor.getBoundingClientRect();
        containerTop = containerRect.top;
        containerLeft = containerRect.left;
      }

      const { x: offsetX, y: offsetY } = this.caretPosOffset;

      this.caretPos = {
        x: x - containerLeft + offsetX,
        y: y - containerTop + offsetY,
      };

      this.$emit('on-sync-caret-pos', { ...this.caretPos });
    },

    /**
     * 在选区内插入HTML
     * @param {string|HTMLElement} content 要插入的内容
     * @param {number} startPos 选区开始位置
     * @param {number} endPos 选区开始位置
     * @param {Node} anchorNode 选区开始节点
     * @param {Node} focusNode 选区结束节点
     */
    insertHtml(
      content,
      startPos = -1,
      endPos = -1,
      anchorNode = null,
      focusNode = null
    ) {
      this.setRichtextEditorFocus();

      insertHtmlByRange(content, startPos, endPos, anchorNode, focusNode);

      this.setLastRangeRecord();
    },

    // 计算滚动高度
    caculateSrcollHeight() {
      const scrollEle = this.richtextEditor;
      if (!scrollEle) return;

      const scrollRect = scrollEle.getBoundingClientRect();
      const selection = window.getSelection();
      if (selection && this.lastRangeRecord) {
        // 清除所有选区
        selection.removeAllRanges();
        // 添加最后光标还原之前的状态
        selection.addRange(this.lastRangeRecord);
      }
      if (selection && selection.rangeCount > 0) {
        const inputRect = getCaretCoordsOfDocument();
        if (scrollRect && inputRect) {
          const top = scrollRect.y;
          const bottom = scrollRect.y + scrollRect.height;
          if (inputRect.y + 20 <= bottom && inputRect.y >= top) {
            return;
          } else if (inputRect.y < top) {
            scrollEle.scrollTop = scrollEle.scrollTop - (top - inputRect.y);
          } else if (inputRect.y + 20 > bottom) {
            scrollEle.scrollTop =
              scrollEle.scrollTop + (inputRect.y - bottom + 20);
          }
        }
      }
    },
  },

  mounted() {
    debug('mounted', '1');
    this.$nextTick(() => {
      this.richtextEditor = this.$refs.richtextRef || null;

      if (!this.richtextEditor) return;
    });
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
  overflow-y: auto;
  overflow-x: hidden;

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
