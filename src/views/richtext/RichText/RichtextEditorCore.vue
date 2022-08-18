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
  getCaretCoordsOfDocument,
  moveCaret2StartOrEnd,
  clearZeroWidthSpace,
  ZeroWidthSpaceChar,
  judgeNodeCannotEditable,
  insertHtmlByRange,
  deleteHtmlByRange,
  EditableNodeTextPattern,
  extractFilterText,
  formatRichtextContent,
  IdentiferFlagOnEle,
} from './util';
import { isPlainObj, isDef, isNumber } from '@/utils/common.js';

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
    // 取消标识符触发选择的函数
    determineCancelIdentifierSelect: {
      type: Function,
      default: (event, currentIndentifier, allIdentifiers) => {
        const pressKey = event.key;
        return (
          [' ', 'ArrowLeft', 'ArrowRight', ...allIdentifiers].includes(
            pressKey
          ) || !EditableNodeTextPattern.test(pressKey)
        );
      },
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
      // 当shift快速放开此时输入@，不会触发@面板问题
      indentiferKeydownRecord: '',
    };
  },

  computed: {
    isExceedMaxlength() {
      return this.richtextEditorOptions.contentLength >= this.maxlength;
    },
    genAllIdentifierOptionsMap() {
      const map = this.identifierOptions.reduce((prev, next) => {
        const item = { ...next };
        // 不传则为节点内容长度
        item.contentLength = isNumber(item.contentLength)
          ? item.contentLength
          : undefined;

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
    // 按下哪些键取消关键词触发的选中
    genCancelIdentifierSelectKeys() {
      return [...this.cancelIdentifierSelectKeys, ...this.genAllIdetifiers];
    },
  },

  watch: {
    maxlength() {
      if (!this.richtextEditor) return;
      // this.setRichtextEditorFocus()
      // // 将光标移动到最后面
      // moveCaret2StartOrEnd(this.richtextEditor, 'end')
      // this.genEditorInputContent()
      this.clearRichtextContent();
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

      setElementDataset(placeholderNode, IdentiferFlagOnEle, identifier);
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
      }
      // 有range记录则不是首次编辑
      else {
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
      let filterText = '';
      if (text && text.length) {
        filterText = extractFilterText(
          text,
          this.richtextEditorOptions.filterTextPattern
        );
      }

      this.richtextEditorOptions.filterText = filterText;
      this.$emit('on-identifier-search', filterText);
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
      const { insertPosition = 'start', insertSpaceAtEnd } =
        currentIndentifierOption;

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
        // 不可编辑后方是否插入空格
        text = `${text}${insertSpaceAtEnd ? ' ' : ''}`;
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

      let contentNode = content;
      if (typeof content === 'string') {
        let text = '';
        if (identifier) {
          // 取消时是否保留标识符
          const { preserveIdentifierOnCancel } =
            this.genAllIdentifierOptionsMap[identifier];

          if (
            isDef(preserveIdentifierOnCancel) &&
            !preserveIdentifierOnCancel
          ) {
            text = content;
          } else {
            text = `${identifier}${content}`;
          }
        } else {
          text = content;
        }
        // 消除0宽节点
        contentNode = document.createTextNode(clearZeroWidthSpace(text));
      }
      if (this.richtextEditor.contains(editingNode)) {
        this.richtextEditor.insertBefore(contentNode, editingNode);
        this.richtextEditor.removeChild(editingNode);
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStartAfter(contentNode);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      // 是否追加0宽占位符
      if (insertEmpty) {
        const emptyNode = document.createTextNode(ZeroWidthSpaceChar);
        this.insertHtml(emptyNode);
      }
      this.setRichtextEditorFocus();
    },

    // 当点击编辑器时
    handleClick(event) {
      this.setRichtextEditorFocus();

      const target = event.target;
      const sel = window.getSelection();
      const range = document.createRange();
      // 如果存在可编辑节点，则始终将光标放在可编辑节点最后一个0宽字符前面：保证删除时判断正常取消触发
      if (this.isTriggerEditing) {
        const textNode = this.richtextEditorOptions.editingNode.childNodes[0];
        range.setStart(textNode, textNode?.textContent.length - 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        // 当点击的不可编辑节点
        if (judgeNodeCannotEditable(target)) {
          // 因为手动插入了空节点，所以取下一个
          const nextEle = target.nextSibling;
          const newTextNode = document.createTextNode('');
          // 下个节点不存在，插入新节点
          if (!nextEle) {
            this.richtextEditor?.appendChild(newTextNode);
            range.setStartBefore(newTextNode);
          }
          // 下个节点不可编辑，则在下个节点前插入一个text节点
          else {
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
      const { key, repeat } = event;
      if (repeat) {
        event.preventDefault();
        return;
      }
      this.indentiferKeydownRecord = this.genAllIdetifiers.includes(key)
        ? key
        : '';
      // 当触发了关键字
      if (this.isTriggerEditing) {
        // 输入法输入不走下面的逻辑
        if (this.compositionOptions.isInputing) return;
        // 按下这几个键时，禁用默认行为
        if (this.preventDefaultKeysOnPanelVisible.includes(key)) {
          event.preventDefault();
          return;
        }
        // 当按下配置的关键字按键或者空格，完取消本次输入
        if (
          this.determineCancelIdentifierSelect(
            event,
            this.richtextEditorOptions.currentIndentifier,
            this.genAllIdetifiers
          )
        ) {
          this.cancelIdentifierSelect(
            this.richtextEditorOptions.currentIndentifier
          );
          // 转换输入内容
          this.genEditorInputContent();

          if (this.isExceedMaxlength) {
            event.preventDefault();
          }
        }
      }
      // 达到最大输入长度，且不是删除和方向键，禁止输入
      else {
        if (
          this.isExceedMaxlength &&
          ![...this.deleteKeys, ...this.arrowKeys].includes(key)
        ) {
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
      let { key } = event;
      if (!key) return;
      key = this.indentiferKeydownRecord || key;
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
          this.genEditorInputContent();
        } else if (this.arrowKeys.includes(key)) {
          // 方向键光标处理
          this.handleArrowKeyEvent(key);
        } else if (!this.isExceedMaxlength) {
          // 转换输入内容
          this.genEditorInputContent();
        }
      } else if (this.genAllIdetifiers.includes(key)) {
        this.indentiferKeydownRecord = '';
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

        // 如果编辑状态，则删除分隔符时删除退出编辑
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
            // 转换输入内容
            this.genEditorInputContent();
            return;
          }
        }

        const textContent = selection?.['anchorNode']?.textContent || '';
        // 设置搜索
        this.setFilterText(textContent);
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
        const isCurNodeFirstCharIsZeroWidthSpace =
          /^[\u200B-\u200D\uFEFF]$/g.test(curNodeTextContent.charAt(0));

        if (index === 0) {
          if (!isCurNodeCannotEditable) {
            // 如果当前节点包含0宽占位节点，才会进行清除操作，解决向后删除时光标闪烁问题
            if (isCurNodeFirstCharIsZeroWidthSpace) {
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
            if (!isCurNodeFirstCharIsZeroWidthSpace) {
              willDeleteNodes.push(prevNode);
            }
          } else {
            // 如果当前节点包含0宽占位节点，才会进行清除操作，解决向后删除时光标闪烁问题
            if (isCurNodeFirstCharIsZeroWidthSpace) {
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
      // 粘贴时，根据配置的关键字是否保留进行格式化
      this.identifierOptions.forEach((item) => {
        const { identifier, preserveIdentifierOnCancel } = item;

        if (!preserveIdentifierOnCancel) {
          paste = paste.replaceAll(identifier, '');
        }
      });

      const {
        richtextEditorOptions: { contentLength },
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

      // 所有子节点
      const allChildNodes = [...this.richtextEditor.childNodes];
      // 过滤后的有效的子节点
      const filterredValidChildNodes = allChildNodes.filter((item) => {
        return item.textContent || item.nodeName === 'BR';
      });

      const {
        contentLength: allContentLength,
        hasIdentifier,
        textNodeContents,
        formattedContents,
      } = formatRichtextContent(
        filterredValidChildNodes,
        this.genAllIdentifierOptionsMap
      );

      /**
       * 删除逻辑：从后往前删除
       *  1. 确定需要删除的长度
       *  2. 确定删除时的结束node
       *  3. 遍历删除
       *    - 如果已经删除的长度满足最大长度，停止遍历
       *    - 如果当前是不可编辑节点，则将整个节点删除，重置删除起始点
       *    - 如果当前节点是可编辑节点，则将节点内容按照可删除的长度一分为二进行字符串截取
       *  4. 得到删除起始点、结束点、起始节点、结束节点，调用delete方法进行删除
       */
      if (allContentLength > this.maxlength) {
        // 至少需要删除多少个长度
        let needDeleteContentLength = allContentLength - this.maxlength;
        // 即将删除的长度，因为可能会删除不可编辑节点
        let willDeleteContentLength = 0;

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let startPos = -1;
          let endPos = -1;
          let startNode = null;
          let endNode = null;
          // 父级选区
          let isParentNodeSelection = false;
          if (sel.anchorNode === this.richtextEditor) {
            startNode = sel.anchorNode;
            endNode = sel.focusNode;
            endPos = sel.focusOffset;
            isParentNodeSelection = true;
          } else {
            const range = sel.getRangeAt(0);
            endNode = range?.endContainer;
            endPos = range?.endOffset || 0;
          }

          // 找到光标此刻所在的节点索引
          let curCaretInChildsIndex = allChildNodes.findIndex(
            (node) =>
              node ===
              (isParentNodeSelection ? allChildNodes[endPos - 1] : endNode)
          );

          while (curCaretInChildsIndex > -1) {
            // 即将删除长度 >= 需要删除的长度
            if (willDeleteContentLength >= needDeleteContentLength) break;
            let curNode = allChildNodes[curCaretInChildsIndex];
            const curNodeInFilterredIndex = filterredValidChildNodes.findIndex(
              (node) => node === curNode
            );
            // 当前节点在过滤后的有效Node中不存在时
            if (curNodeInFilterredIndex < 0) {
              curCaretInChildsIndex--;
              continue;
            }
            // 当遍历完成到没有节点时
            if (!curNode) break;

            const isCurNodeCannotEditable = judgeNodeCannotEditable(curNode);
            const curNodeFormattedContent =
              formattedContents[curNodeInFilterredIndex];

            // 当是父级选区，删除整个node
            if (isParentNodeSelection) {
              startPos = curCaretInChildsIndex;
              willDeleteContentLength += curNodeFormattedContent.contentLength;
              formattedContents.splice(curNodeInFilterredIndex, 1);
            } else {
              // 不可编辑节点
              if (isCurNodeCannotEditable) {
                startNode = curNode;
                startPos = 0;
                willDeleteContentLength +=
                  curNodeFormattedContent.contentLength;
                formattedContents.splice(curNodeInFilterredIndex, 1);
              }
              // 可编辑节点
              else {
                const curNodeTextContent = curNode.textContent;
                const isCurNodeFirstCharIsZeroWidthSpace =
                  /^[\u200B-\u200D\uFEFF]$/g.test(curNodeTextContent.charAt(0));

                // 当前节点可以删除的长度，从节点内容起点开始
                let canDeleteLength = 0;
                if (curNode === startNode) {
                  canDeleteLength = isCurNodeFirstCharIsZeroWidthSpace
                    ? startPos - 1
                    : startPos;
                } else {
                  canDeleteLength = curNodeFormattedContent.contentLength;
                }

                // 前半部分
                const curNodeContent = curNodeFormattedContent.content;
                let firstHalfContent = curNodeContent.slice(0, canDeleteLength);
                // 后半部分
                let secondHalfContent = curNodeContent.slice(canDeleteLength);

                if (
                  canDeleteLength + willDeleteContentLength >=
                  needDeleteContentLength
                ) {
                  // 开始删除
                  let deletedFirstHalfContent = firstHalfContent.slice(
                    0,
                    -(needDeleteContentLength - willDeleteContentLength)
                  );

                  startPos =
                    deletedFirstHalfContent.length +
                    (isCurNodeFirstCharIsZeroWidthSpace ? 1 : 0);

                  curNodeFormattedContent.content =
                    deletedFirstHalfContent + secondHalfContent;
                  curNodeFormattedContent.contentLength =
                    curNodeFormattedContent.content.length;

                  willDeleteContentLength +=
                    firstHalfContent.length - deletedFirstHalfContent.length;
                } else {
                  startPos = 0;
                  curNodeFormattedContent.content = secondHalfContent;
                  curNodeFormattedContent.contentLength =
                    secondHalfContent.length;
                  willDeleteContentLength += canDeleteLength;
                }

                startNode = curNode;
              }
            }

            curCaretInChildsIndex--;
          }

          deleteHtmlByRange(startPos, endPos, startNode, endNode);
        }

        this.richtextEditorOptions.contentLength =
          allContentLength - willDeleteContentLength;
      } else {
        this.richtextEditorOptions.contentLength = allContentLength;
      }

      // eslint-disable-next-line no-console
      console.log('formattedContents', formattedContents);

      // 向外发送的数据
      const emitData = {
        contentLength: this.richtextEditorOptions.contentLength,
        content: formattedContents.filter((item) => {
          // 过滤掉content为空串的
          const noContentText = item.type === 'text' && item.content === '';
          return !noContentText;
        }),
        hasIdentifier: hasIdentifier,
        textNodeContents: textNodeContents,
      };

      this.$emit('on-input-change', emitData);
    },

    // 点击容器外：是指包含输入节点、快捷插入节点等之外的节点
    handleClickoutside() {
      if (!this.richtextEditorOptions.isFocus) return;

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

      const oldInnerHtml = this.richtextEditor.innerHTML;
      if (!oldInnerHtml) return;

      this.richtextEditor.innerHTML = '';
      this.genEditorInputContent();
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
     * @param {Node} startNode 选区开始节点
     * @param {Node} endNode 选区结束节点
     */
    insertHtml(
      content,
      startPos = -1,
      endPos = -1,
      startNode = null,
      endNode = null
    ) {
      this.setRichtextEditorFocus();

      insertHtmlByRange(content, startPos, endPos, startNode, endNode);

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
  word-break: break-all;
  border: 1px solid red;
  background: rgb(176, 185, 149);
  /* 解决删除高亮节点时，光标会闪烁到该行末尾再回来的问题 */
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
