import { isRegExp, isPlainObj } from '@/utils/common';
import { debounce } from '@/utils/debounce-throttle';

/* 限制输入框只能输入number类型 */
const Price_Pattern = /(^[1-9]([0-9]+)?(\.[0-9]{1,2})?)|(^(0){1}$)|(^[0-9]\.[0-9]([0-9])?)/;
const Integer_Pattern = /^(0|[1-9]\d*)/;

const REGEXP_MODIFIERS = ['replace', 'match'];
// JavaScript 中最大的安全整数 2^53 - 1
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/**
 * 创建处理函数
 * @param {RegExp} regexp 正则
 * @param {'match'|'replace'} modifier 正则使用replace or match格式化
 * @param {Number|String} max 最大值
 */
const createHandler = (
  regexp,
  modifier = 'match',
  max = MAX_SAFE_INTEGER,
  min = 0
) => {
  if (!isRegExp(regexp)) {
    throw new Error('请传入正则表达式！');
  }
  modifier = REGEXP_MODIFIERS.includes(modifier)
    ? modifier
    : REGEXP_MODIFIERS[0];
  max = Number(max) || 0;
  max = max > MAX_SAFE_INTEGER ? MAX_SAFE_INTEGER : max;
  /**
   * 返回处理函数
   */
  return value => {
    let _res;
    if (modifier === 'replace') {
      _res = value.toString().replace(regexp, '');
    }
    else {
      const _match = value.toString().match(regexp);
      if (_match != null) {
        _res = _match[0];
      }
      else {
        _res = null;
      }
    }

    if (Number(_res) > max) {
      _res = max;
    }
    if (Number(_res) < min) {
      _res = min;
    }
    return _res;
  };
};
/**
 * 整数处理
 * @param {*} value
 */
const IntegerHandle = (max, min) => {
  return createHandler(Integer_Pattern, 'match', max, min);
};

/**
 * 金额处理
 * @param {*} value
 */
const PriceHandle = (max, min) => {
  return createHandler(Price_Pattern, 'match', max, min);
};

/**
 * 参考 https://github.com/vuejs/Discussion/issues/157#issuecomment-273301588
 * 触发事件以便通知vue进行数据更新
 * @param {*} el
 * @param {*} type
 */
const trigger = (el, type) => {
  const e = document.createEvent('HTMLEvents');
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
};

/**
 * 输入框输入只能输入数字（整数和浮点型）
 * 使用方式：v-number:integer="max"
 * :integer(默认)：可以替换成price，整数还是金额格式，忽略.replace和match
 * value：
 *    1、输入数字的最大值,大于这个值将会重置为最大值
 *    2、输入对象{min, max},指定最小值和最大值
 */
const NumberDirective = {
  bind (el, binding) {
    const { arg = 'integer', value } = binding;
    let max, min;
    // 如果是对象
    if (isPlainObj(value)) {
      ({ max, min } = value);
    }
    else {
      max = value;
      min = 0;
    }
    // 搜索input
    let _input = el;
    if (_input.tagName.toUpperCase() !== 'INPUT') {
      _input = _input.querySelector('input');
    }
    if (!_input) return;
    // 分情况绑定处理函数
    let handler;

    if (arg === 'integer') {
      handler = IntegerHandle(max, min);
    }
    else {
      handler = PriceHandle(max, min);
    }
    // 监听事件，去抖的方式执行处理函数
    _input.onkeyup = debounce(() => {
      _input.value = handler(_input.value);
      trigger(_input, 'input');
    }, 1000);
    _input.onblur = debounce(() => {
      _input.value = handler(_input.value);
      trigger(_input, 'input');
    }, 1000);
  }
};

export default function (Vue) {
  Vue.directive('number', NumberDirective);
}
