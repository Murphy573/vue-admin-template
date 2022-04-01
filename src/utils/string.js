/**
 * 字符串排序
 * @param {String} str 字符串
 */
export function sortCharactersInString(str) {
  return str
    .split('')
    .sort((a, b) => a.localeCompare(b))
    .join('');
}

// 反转一个字符串
export function reverseString(str) {
  return str.split('').reverse().join('');
}

// 将回车(\n)替换为<br/>
export function replaceEnter2Br(str) {
  return str.replace(/\n/g, '<br/>');
}
// 将<br/>替换为回车(\n)
export function replaceBr2Enter(str) {
  return str.replace(/<br\/>/g, '\n');
}

// 大写每个单词的首字母: 'hello world!' -> 'Hello World!'
export function capitalizeEveryWord(str) {
  return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * 普通UUID生成
 * @param {String|Number} suffix 后缀
 * @returns {String} UUID
 */
export function generateUUID(suffix) {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
  if (typeof suffix === 'string' || typeof suffix === 'number') {
    return uuid + ':' + suffix;
  } else {
    return uuid + '';
  }
}

/**
 * 生成唯一字符串
 * @param {Number} len 长度
 * @param {Number} radix 进制
 * @template 8 character ID (base=2) generateUniqueIdByCustom(8, 2) // "01001010"
 * @template 8 character ID (base=10) generateUniqueIdByCustom(8, 10) // "47473046"
 * @template 8 character ID (base=16) generateUniqueIdByCustom(8, 16) // "098F4D35"
 */
export function generateUniqueIdByCustom(len, radix) {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  const uuid = [];
  let i;
  radix = radix || chars.length;

  if (len) {
    // Compact form
    for (i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)];
  } else {
    // rfc4122, version 4 form
    let r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data. At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16);
        uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r];
      }
    }
  }

  return uuid.join('');
}

/**
 * 限制输入框小数点后两位
 * @param {String} value 输入框的value
 */
export function inputDecimal(value) {
  return value.match(/^\d*(\.?\d{0,2})/g)[0];
}
