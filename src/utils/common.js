export function noop() {}

export function transferTargetType(target) {
  return Object.prototype.toString.call(target);
}

export function isString(target) {
  return typeof target === 'string';
}

export function isObject(target) {
  return transferTargetType(target) === '[object Object]';
}

export function isNull(target) {
  return transferTargetType(target) === '[object Null]';
}

export function isUndefined(target) {
  return transferTargetType(target) === '[object Undefined]';
}

export function isArray(target) {
  return transferTargetType(target) === '[object Array]';
}

export function isRegExp(target) {
  return transferTargetType(target) === '[object RegExp]';
}

export function isDate(target) {
  return transferTargetType(target) === '[object Date]';
}

export function isFunction(target) {
  return transferTargetType(target) === '[object Function]';
}

export function isBoolean(target) {
  return transferTargetType(target) === '[object Boolean]';
}

// 判断是否是数字：数字字符串也认为是数字
export function isNumber(target) {
  return /^[+-]?\d+(\.\d+)?([Ee][+-]?[\d]+)?$/.test(target);
}

/* 是否是纯对象 */
export function isPlainObj(target) {
  return !isNull(target) && isObject(target);
}

/* 是否是promise */
export function isPromise(target) {
  if (transferTargetType(target) !== '[object Promise]') {
    return (
      target !== null &&
      typeof target === 'object' &&
      isFunction(target.then) &&
      isFunction(target.catch)
    );
  }
  return true;
}

/**
 * 是否定义
 */
export function isDef(value) {
  return !isUndefined(value) && !isNull(value);
}

// 等待毫秒数
export function sleep(millisecond = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, millisecond);
  });
}

/**
 * 增强error
 * @param {String} msg 错误消息
 * @param {String|Number} code 错误码
 */
export function enhanceError(msg = '', code) {
  const _error = new Error(msg);
  _error.code = code;
  return _error;
}
