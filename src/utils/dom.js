import { isDef, isNumber } from './common';

/**
 * 判断元素是否存在className
 * @param {Element} el
 * @param {String} className
 */
export function hasClass (el, className) {
  const reg = new RegExp('(^|\\s)' + className + '(\\s|$)');
  return reg.test(el.className);
}

/**
 * 添加class
 * @param {Element} el
 * @param {String} className
 */
export function addClass (el, className) {
  if (hasClass(el, className)) {
    return;
  }

  const newClass = el.className.split(' ');
  newClass.push(className);
  el.className = newClass.join(' ');
}

/**
 * 移除class
 * @param {Element} el
 * @param {String} className
 */
export function removeClass (el, className) {
  if (!hasClass(el, className)) {
    return;
  }

  const reg = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  el.className = el.className.replace(reg, ' ');
}

/**
 * 获取或者设置h5自定义属性data-*
 * @param {Element} el
 * @param {String} name
 * @param {Any} val
 */
export function handleData (el, name, val) {
  const prefix = 'data-';
  if (val) {
    return el.setAttribute(prefix + name, val);
  }
  return el.getAttribute(prefix + name);
}

export function getRect (el) {
  if (el instanceof window.SVGElement) {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };
  }
  else {
    return {
      top: el.offsetTop,
      left: el.offsetLeft,
      width: el.offsetWidth,
      height: el.offsetHeight
    };
  }
}

/* 是否支持passsive:调用 preventDefault()无效 */
let supportsPassive = false;
try {
  const opts = {};
  Object.defineProperty(opts, 'passive', {
    get () {
      /* istanbul ignore next */
      supportsPassive = true;
    }
  });
  window.addEventListener('test-passive', null, opts);
}
catch (e) {}
/**
 * 监听事件
 * @param {HTMLElement} target dom
 * @param {String} event 事件名称
 * @param {Function} handler 处理函数
 * @param {Boolean} passive 是否支持
 */
export function on (target, event, handler, passive = false) {
  target.addEventListener(
    event,
    handler,
    supportsPassive ? { capture: false, passive } : false
  );
}
/**
 * 监听事件
 * @param {HTMLElement} target dom
 * @param {String} event 事件名称
 * @param {Function} handler 处理函数
 */
export function off (target, event, handler) {
  target.removeEventListener(event, handler);
}

/**
 * 添加单位
 * @param {String|Number} value size
 * @param {String} suffix 单位 默认px
 */
export function addUnit (value, suffix = 'px') {
  if (!isDef(value)) {
    return undefined;
  }

  value = String(value);
  return isNumber(value) ? `${value}${suffix}` : value;
}
