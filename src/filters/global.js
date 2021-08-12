import { formatDate } from '../utils/date';

export function date (target, format) {
  return formatDate(target, format);
}

/**
 * 对数字或者类数字字符串进行格式化
 * @param {String<Number> | Number} target 要转换的数字或类数字字符串
 * @param {Number} hold 保留几位小数
 * @param {Boolean} rounding 是否四舍五入
 */
export function NumberFormat (target, hold = 0, rounding = true) {
  if (Number.isNaN(Number(target))) return null;
  const r = /^\+?[1-9][0-9]*$/;
  hold = r.test(hold) ? Number(hold) : 0;
  target = Number(target);
  const _multiplier = Math.pow(10, hold);

  if (rounding) {
    return Math.round(target * _multiplier) / _multiplier;
  }
  else {
    return Math.floor(target * _multiplier) / _multiplier;
  }
}

// 金额格式化
export function price (value, prefix = '¥') {
  if (Number.isNaN(Number(value))) return null;

  let _res = NumberFormat(value, 2);
  const s = _res.toString().split('.');
  // 判断数组长度确定是否补0
  if (s.length === 1) {
    _res = _res.toString() + '.00';
  }
  else if (s.length > 1) {
    if (s[1].length < 2) {
      _res = _res.toString() + '0';
    }
  }

  return `${prefix}${_res}`;
}
