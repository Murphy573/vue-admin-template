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
export const ZeroWidthSpaceChar = '\u200b';
// 空格字符
export const SpaceHolderChar = '\xA0';
// 清除0宽
export function clearZeroWidthSpace(str) {
  return str.replace(/[\u200B-\u200D\uFEFF]*/g, '');
}
