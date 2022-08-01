// 获取光标在整个文档内的坐标
export function getCaretCoordsOfDocument() {
  let rect;
  let x = 0;
  let y = 0;
  let sel = window.getSelection();

  if (!sel || !sel.rangeCount) {
    return { x, y };
  }

  let range = sel.getRangeAt(0).cloneRange();
  if (range.getClientRects) {
    range.collapse(true);
    let rects = range.getClientRects();
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
    let span = document.createElement('span');
    if (span.getClientRects) {
      // Ensure span has dimensions and position by
      // adding a zero-width space character
      span.appendChild(document.createTextNode('\u200b'));
      range.insertNode(span);
      rect = span.getClientRects()[0];
      x = rect.left;
      y = rect.top;
      let spanParent = span.parentNode;
      spanParent?.removeChild(span);

      // Glue any broken text nodes back together
      spanParent?.normalize();
    }
  }
  return { x, y };
}

// h5 dataset设置
export function setElementDataset(target, name, value) {
  if (target.dataset) {
    target.dataset[name] = value;
  } else {
    target.setAttribute(`data-${name}`, value);
  }
}
// h5 dataset获取值
export function getElementDataset(target, name) {
  if (target.dataset) {
    return target.dataset[name];
  }

  return target.getAttribute(`data-${name}`);
}

// 移动光标到指定节点开头或者末尾
export function moveCaret2StartOrEnd(el, type = 'start') {
  if (!el) return;

  const sel = window.getSelection();
  sel?.selectAllChildren(el);
  //光标移至开头
  if (type === 'start') {
    sel?.collapseToStart();
  } else {
    //光标移至末尾
    sel?.collapseToEnd();
  }
}

// 0宽字符
export const ZeroWidthSpaceChar = '\u200B';
// 空格字符
export const SpaceHolderChar = '\xA0';
// 清除0宽
export function clearZeroWidthSpace(str) {
  return str.replace(/[\u200B-\u200D\uFEFF]*/g, '');
}

/**
 * 判断节点是否不可编辑
 * @param {Node} ele 节点
 * @param {String} nodeName 手动指定某个节点也视为不可编辑节点
 * @returns {boolean}
 */
export function judgeNodeCannotEditable(ele, nodeName = 'BR') {
  return (
    ele.nodeName !== '#text' &&
    (ele?.getAttribute?.('contenteditable') === 'false' ||
      ele?.nodeName === nodeName)
  );
}

/**
 * 删除指定选区的的html
 * @param {number} startPos 选区开始位置
 * @param {number} endPos 选区开始位置
 * @param {Node} anchorNode 选区开始节点
 * @param {Node} focusNode 选区结束节点
 * @returns {boolean} 是否删除成功
 */
export function deleteHtmlByRange(
  startPos = -1,
  endPos = -1,
  anchorNode = null,
  focusNode = null
) {
  let sel = window.getSelection();
  let range = document.createRange();
  if (!range || !sel) return false;

  anchorNode = anchorNode || sel.anchorNode;
  focusNode = focusNode || sel.focusNode;

  if (!anchorNode || !focusNode) return false;

  if (startPos < 0 || endPos < 0) {
    startPos = sel.anchorOffset;
    endPos = sel.focusOffset;
  }

  range.setStart(anchorNode, startPos);
  range.setEnd(focusNode, endPos);
  range.deleteContents();
  range.detach();

  return true;
}

/**
 * 在选区内插入HTML
 * @param {string|HTMLElement} content 要插入的内容
 * @param {number} startPos 选区开始位置
 * @param {number} endPos 选区开始位置
 * @param {Node} anchorNode 选区开始节点
 * @param {Node} focusNode 选区结束节点
 * @returns {boolean} 是否插入成功
 */
export function insertHtmlByRange(
  content,
  startPos = -1,
  endPos = -1,
  anchorNode = null,
  focusNode = null
) {
  // 先执行删除删除
  deleteHtmlByRange(startPos, endPos, anchorNode, focusNode);

  let sel = window.getSelection();
  // 必须从selection拷贝一个range，不能在document.createRange创建的range对象中执行插入操作（insertNode）
  let range = sel.getRangeAt(0).cloneRange();

  if (!range) return false;

  let curNode;
  let lastNode;
  if (typeof content === 'string') {
    let el = document.createElement('div');
    el.innerHTML = content;
    let frag = document.createDocumentFragment();
    while ((curNode = el.firstChild)) {
      lastNode = frag.appendChild(curNode);
    }
    range.insertNode(frag);
  } else {
    lastNode = content;
    range.insertNode(lastNode);
  }

  if (lastNode) {
    range = range.cloneRange();
    range.setStartAfter(lastNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    return true;
  }

  return false;
}
