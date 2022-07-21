<template>
  <div>
    <div
      ref="richtextRef"
      class="my-richtext"
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
const ZeroWidthSpace = '\u200b';
const SpaceHolder = '\xA0';

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
    };
  },

  computed: {
    isExceedMaxlength() {
      return this.richtextEditorOptions.contentLength >= this.maxlength;
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

  methods: {
    // 关键词触发的选中：外部调用
    confirmIdentifierSelect({
      identifier,
      data,
      contentKey,
      identifierAlsoEnd,
    }) {
      const currentIndentifierOption =
        this.genAllIdentifierOptionsMap[identifier];
      if (!currentIndentifierOption) {
        this.cancelIdentifierSelect(
          this.richtextEditorOptions.currentIndentifier
        );
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
      text = this.clearZeroWidthSpace(text);
      const match = this.richtextEditorOptions.filterTextPattern?.exec?.(
        text || ''
      );
      if (match && match.length === 2) {
        this.richtextEditorOptions.filterText = match[1];
        this.$emit('on-identifier-search', match[1]);
      } else {
        this.$emit('on-identifier-search', '');
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
      font.setAttribute('tabindex', -1);
      // 编辑时，content左右插入0宽节点
      const text = `${identifier}${canEdit ? ZeroWidthSpace : ''}${content}${
        canEdit ? ZeroWidthSpace : ''
      }${identifierAlsoEnd ? identifier : ''}`;
      const textNode = document.createTextNode(canEdit ? text : ` ${text}`);
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
        // 消除0宽节点
        newTextNode = document.createTextNode(
          this.clearZeroWidthSpace(`${identifier}${content}`)
        );
      }
      if (this.richtextEditor.contains(editingNode)) {
        this.richtextEditor.insertBefore(newTextNode, editingNode);
        this.richtextEditor.removeChild(editingNode);
      }
      // 是否追加空格
      if (insertEmpty) {
        const emptyNode = document.createTextNode(SpaceHolder);
        this.insertContentOnCaret({ content: emptyNode });
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
        if (target?.getAttribute?.('contenteditable') === 'false') {
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
            if (nextEle?.getAttribute?.('contenteditable') === 'false') {
              newTextNode.textContent = SpaceHolder;
              this.richtextEditor.insertBefore(newTextNode, nextEle);
              range.setStart(newTextNode, 1);
            } else {
              const nextEleContent = nextEle.textContent;
              // 下个节点内容的首字符是否是空格字符
              if (!/^\xA0$/g.test(nextEleContent.charAt(0))) {
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
          // ctrl键提交
          // if (event.metaKey || event.ctrlKey) {
          //   if (this.editor?.innerHTML && !this.exceedMax) {
          //     this.$emit('on-enter', event);
          //     this.clearEditor();
          //   }
          // } else {
          // }
          if (!this.isCanLF) return;
          // 换行
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const startOffset = range?.startOffset || 0;
            const endOffset = range?.endOffset || 0;
            // NOTE: br添加0宽节点，解决有字符需要按下两次回车才会换行的问题
            this.pasteHtml(`<br/>${ZeroWidthSpace}`, startOffset, endOffset);
            this.caculateSrcollHeight();
          }
        }
        // else {
        //   if (this.deleteKeys.includes(key)) {
        //     if (key === this.deleteKeys[0]) {
        //       const selection = window.getSelection();
        //       if (!selection?.isCollapsed) return;
        //       const range = selection?.getRangeAt(0);
        //       debugger;
        //       debug(selection);
        //       const selAnchorNode = range.startContainer;
        //       debug('selAnchorNode', selAnchorNode);
        //       const selAnchorNodeContent = selAnchorNode?.textContent;
        //       debug('selAnchorNodeContent', selAnchorNodeContent);
        //       if (!selAnchorNodeContent) {
        //         const prevNode = selAnchorNodeContent.previousSibling;
        //         debug('prevNode', prevNode);
        //         if (prevNode?.getAttribute?.('contenteditable') === 'false') {
        //           prevNode?.parentNode?.removeChild?.(prevNode);
        //         }
        //       }
        //     }
        //   }
        // }

        // 转换输入内容
        // this.genEditorInputContent();
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
        // 当最后的节点为高亮节点时，会有指针位置紊乱的问题，在生成高亮节点时通过尾部加上空格规避，删除空格时连带高亮节点一起删除
        if (!this.richtextEditor) return;
        // 输入空格再删除时有可能会有空节点遗留，判断时过滤掉textContent为空的节点
        const childNodes = [...this.richtextEditor.childNodes].filter(
          (item) => {
            return !!item.textContent;
          }
        );
        if (childNodes?.length) {
          const lastNode = childNodes[childNodes.length - 1];
          if (lastNode?.getAttribute?.('contenteditable') === 'false') {
            this.richtextEditor.removeChild(lastNode);
          }
        }

        // 转换输入内容
        this.genEditorInputContent();
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
            anchorNode?.textContent?.indexOf(ZeroWidthSpace) || 0;
          const lastSperator =
            anchorNode?.textContent?.lastIndexOf(ZeroWidthSpace) || 0;
          if (firstSperator >= lastSperator) {
            this.cancelIdentifierSelect(
              this.richtextEditorOptions.currentIndentifier
            );
            return;
          }
        }

        // 非输入法输入: 左右移动光标、ESC退出@编辑模式
        if (['ArrowLeft', 'ArrowRight'].indexOf(key) >= 0) {
          this.cancelIdentifierSelect(
            this.richtextEditorOptions.currentIndentifier
          );
          return;
        }

        // 设置搜索
        this.setFilterText(selection?.['anchorNode']?.textContent || '');
      }
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
          this.pasteHtml(
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
      this.pasteHtml(paste, startOffset, endOffset);
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
            const textContent = this.clearZeroWidthSpace(
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
            const identifier = this.getElementDataset(item, 'identifier');
            if (identifier) {
              hasIdentifierNode = true;
              const identifierDataInfo = JSON.parse(
                this.getElementDataset(
                  item,
                  this.genAllIdentifierOptionsMap[identifier].datasetKey
                )
              );
              contentLength += 1;
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
          this.deleteHtml(
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
      this.moveCaret2StartOrEnd('end');
      this.setLastRangeRecord();
      this.richtextEditor?.blur();
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

      this.setLastRangeRecord();
    },

    // 计算滚动高度
    caculateSrcollHeight() {
      const scrollEle = this.richtextEditor;
      if (!scrollEle) {
        return;
      }
      const scrollRect = scrollEle.getBoundingClientRect();
      const selection = window.getSelection();
      if (selection && this.lastRangeRecord) {
        // 清除所有选区
        selection.removeAllRanges();
        // 添加最后光标还原之前的状态
        selection.addRange(this.lastRangeRecord);
      }
      if (selection && selection.rangeCount > 0) {
        const inputRect = this.getCaretCoordsOfDocument();
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
    // 清除0宽节点
    clearZeroWidthSpace(str) {
      return str.replace(/[\u200B-\u200D\uFEFF]*/g, '');
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
