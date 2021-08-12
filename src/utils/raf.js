/* requestAnimationFrame */

let prev = Date.now();

/**
 * 当requestAnimationFrame方法不存在时将会使用此方法
 * @param {Function} fn 执行函数
 */
function fallback (fn) {
  const curr = Date.now();
  const ms = Math.max(0, 16 - (curr - prev));
  const id = setTimeout(fn, ms);
  prev = curr + ms;
  return id;
}

// 定义window
const root = window;
// 定义执行频率函数
const iRaf = root.requestAnimationFrame || fallback;
// 定义取消函数
const iCancel = root.cancelAnimationFrame || root.clearTimeout;

/**
 * 导出执行频率函数
 * @param {Function} fn 每一帧执行的函数
 * @returns {Number} 返回一个可取消的rafId
 */
export function raf (fn) {
  return iRaf.call(root, fn);
}

/**
 * 取消执行频率函数的执行
 * @param {Number|String} id 执行频率函数的id
 */
export function cancelRaf (id) {
  iCancel.call(root, id);
}
