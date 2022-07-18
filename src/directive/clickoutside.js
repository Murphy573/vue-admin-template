/* 点击dom外指令 */

const isFunction = (target) =>
  Object.prototype.toString.call(target) === '[object Function]';

const context = '_clickoutside_context';

// 唯一合并id，自增
let mergeUniqueId = 1;
// 唯一元素id，自增
let elementUniqueId = 1;

// 合并后的元素映射
const mergedElementMapper = {};

// 全局click事件
document.addEventListener(
  'click',
  (e) => {
    if (!e.target) return;

    const keys = Object.keys(mergedElementMapper);

    keys.forEach((key) => {
      const elements = mergedElementMapper[key];

      const isClickIn = elements.some((ele) => {
        const copyEl = ele;

        const { handler } = copyEl[context];

        return handler(e);
      });

      // 如果事件触发不在节点内，触发回调
      if (!isClickIn) {
        elements.forEach((ele) => {
          const copyEl = ele;

          const { callback } = copyEl[context];

          isFunction(callback) && callback?.(e);
        });
      }
    });
  },
  false
);

// 构造判断是否在event.target内的处理函数
const createJudgeInHandler = (el) => {
  return (e) => {
    const target = e.target;

    if (!target) return true;

    // 包含则不执行
    if (el.contains(target) || el === target) return true;

    return false;
  };
};

// 根据arg获取对应的合并信息
const splitIdentifier = '__';
const getMergedInfoByArg = (arg) => {
  if (!arg) {
    const id = (mergeUniqueId++).toString();
    mergedElementMapper[id] = [];

    return {
      mergedId: id,
      mergedElementList: mergedElementMapper[id],
    };
  }

  const keys = Object.keys(mergedElementMapper);

  let argId = keys.find((key) => {
    const curArg = key
      .toString()
      .substring(0, key.toString().lastIndexOf(splitIdentifier));

    return curArg === arg;
  });

  if (!argId) {
    argId = `${arg}${splitIdentifier}${mergeUniqueId++}`;
    mergedElementMapper[argId] = [];
  }

  return {
    mergedId: argId,
    mergedElementList: mergedElementMapper[argId],
  };
};

// 从合并后的列表移除当前节点
const removeElFromMergedElementMapper = (el) => {
  const $el = el;

  // 兼容处理，防止没找到报错
  if (!$el[context]) return { mergedId: '', mergedElementList: [] };

  const { mergedId: oldMergedId, elementId: oldElementId } = $el[context];
  const oldElementList = mergedElementMapper[oldMergedId];
  const findOldIndex = oldElementList.findIndex((cachedEl) => {
    const $cachedEl = cachedEl;
    const cachedElElmentId = $cachedEl[context].elementId;

    return cachedElElmentId === oldElementId;
  });

  if (findOldIndex > -1) {
    oldElementList.splice(findOldIndex, 1);
  }

  return {
    mergedId: oldMergedId,
    mergedElementList: oldElementList,
  };
};

/**
 * 点击元素外指令
 * @description 使用方式：v-clickoutside:arg="function"
 * @description arg: 多用于多个元素的点击事件外执行同一动作的情况
 *   不传，则默认自增id;
 *   传入，则合并arg标识符下的所有回调：
 *      当事件触发元素在任意一个该标识符下的el内，则不执行回调function；
 *      当事件触发元素不在任意一个该标识符下的el内，则执行所有回调function；
 * @description function: 可以不传
 */
const clickoutside = {
  bind(el, binding) {
    const { arg, value } = binding;

    const handler = createJudgeInHandler(el);

    const { mergedId, mergedElementList } = getMergedInfoByArg(arg);

    const $el = el;

    $el[context] = {
      elementId: elementUniqueId++,
      mergedId,
      handler,
      callback: value,
    };

    mergedElementList.push($el);
  },

  update(el, binding) {
    const { arg, value } = binding;

    removeElFromMergedElementMapper(el);

    const handler = createJudgeInHandler(el);

    const { mergedId, mergedElementList } = getMergedInfoByArg(arg);

    const $el = el;
    $el[context] = {
      elementId: elementUniqueId++,
      mergedId,
      handler,
      callback: value,
    };

    mergedElementList.push($el);
  },

  unbind(el) {
    const { mergedId, mergedElementList } = removeElFromMergedElementMapper(el);

    if (!mergedElementList.length) {
      delete mergedElementMapper[mergedId];
    }
  },
};

export default function (Vue) {
  Vue.directive('clickoutside', clickoutside);
}
