/**
 * 组合函数调用: 从右至左
 * @param  {...Function} funcs 以函数为参数进行传递
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
export const compose = function (...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (prev, next) =>
      (...args) =>
        prev(next(...args))
  );
};

/**
 * 组合函数调用：从左至右
 * @param  {...Function} funcs 以函数为参数进行传递
 * from left to right. For example, compose(f, g, h) is identical to doing
 * (...args) => h(g(f(...args))).
 */
export const pipe = function (...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
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

/**
 * waitFor 多次运行回调，直到达到超时
 * @param {() => Promise<T> | T} callback 轮询执行的回调：当为promise时，重试至resolve；当为同步函数时，在函数内手动抛出错误可执行重试，否则只会执行一次；
 * @param options 配置选项
 * @returns {Promise<T>}
 */
export function waitFor(
  callback,
  {
    // 间隔多长时间调用一次次callback，直至完成或者超时，单位ms
    interval = 50,
    // 超时时间，单位ms
    timeout = 30 * 1000,
    // 超时后的回调
    onTimeout = (error) => {},
  } = {}
) {
  if (typeof callback !== 'function') {
    throw new TypeError('`callback` 参数必须是函数');
  }

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    let lastError = new Error('');
    let intervalId = -1;
    let timeoutId = -1;
    // eslint-disable-next-line no-unused-vars
    let finished = false;
    let promiseStatus = 'idle';

    // 执行完毕处理，无论成功和失败
    const handleDone = (result, error) => {
      finished = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };

    // 超时处理
    const handleTimeout = () => {
      let error = new Error('waitFor 执行超时了！');

      if (lastError) {
        error = lastError;
      }

      onTimeout?.(error);
      handleDone(null, error);
    };

    // 检测回调
    const checkCallback = () => {
      if (promiseStatus === 'pending') return;
      try {
        const result = callback?.();
        const promiseResult = result;
        if (typeof promiseResult?.then === 'function') {
          promiseStatus = 'pending';
          promiseResult.then(
            (resolvedValue) => {
              promiseStatus = 'resolved';
              handleDone(resolvedValue, null);
            },
            (rejectedValue) => {
              promiseStatus = 'rejected';
              lastError = rejectedValue;
            }
          );
        } else {
          handleDone(result);
        }
      } catch (error) {
        lastError = error;
      }
    };
    // 超时
    timeoutId = window.setTimeout(handleTimeout, timeout);
    // 间隔时间
    intervalId = window.setInterval(checkCallback, interval);
  });
}
