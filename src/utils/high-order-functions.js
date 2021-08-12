/**
 * 组合函数调用: 从右至左
 * @param  {...Function} funcs 以函数为参数进行传递
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
export const compose = function (...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((prev, next) => (...args) => prev(next(...args)));
};

/**
 * 组合函数调用：从左至右
 * @param  {...Function} funcs 以函数为参数进行传递
 * from left to right. For example, compose(f, g, h) is identical to doing
 * (...args) => h(g(f(...args))).
 */
export const pipe = function (...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(function (prev, next) {
    return (...args) => {
      return next(prev(...args));
    };
  });
};
