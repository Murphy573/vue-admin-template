import { isNull, isUndefined } from './common';
import { appendStoragePrefix, removeStoragePrefix } from './storage-prefix';

const returnValue = (value) => {
  if (isNull(value)) {
    return undefined;
  }
  return value;
};

const getItem = (type, args) => {
  if (!args.length || !type) return;

  if (args.length === 1) {
    return returnValue(window[type].getItem(appendStoragePrefix(args[0])));
  }
  else {
    const storage = {};
    args.forEach(arg => {
      storage[arg] = returnValue(window[type].getItem(appendStoragePrefix(arg)));
    });
    return storage;
  }
};

const setItem = (type, args) => {
  if (!args.length || !type) return;

  if (
    args.length === 1 &&
    Object.prototype.toString.call(args[0]) === '[object Object]'
  ) {
    let data = args[0];
    Object.keys(data).forEach(key => {
      let value = data[key];
      if (!isUndefined(value)) {
        window[type].setItem(appendStoragePrefix(key), value);
      }
    });
  }
  else {
    if (!isUndefined(args[1])) {
      window[type].setItem(appendStoragePrefix(args[0]), args[1]);
    }
  }
};

const removeItem = (type, args) => {
  if (!args.length || !type) return;

  if (args.length === 1) {
    window[type].removeItem(appendStoragePrefix(args[0]));
  }
  else {
    args.forEach(arg => {
      window[type].removeItem(appendStoragePrefix(arg));
    });
  }
};

const getAllItems = type => {
  if (!type) return {};
  let _storage = window[type];
  let _len = _storage.length;
  let i = 0;
  let _res = {};
  while (i < _len) {
    let _key = _storage.key(i),
      _value = _storage.getItem(_key);
    _res[removeStoragePrefix(_key)] = _value;
    i++;
  }

  return _res;
};

/**
 * 构造自定义storage
 * @param {String} type localStorage || sessionStorage
 */
const build = type => {
  return {
    type,
    /**
     * 获取
     * 使用方式：
     *  1、getItem('key') return 'value' ， 即原有方式
     *  2、getItem('key1', 'key2', ..) return {key1: value1,key2: value2,...}，即：输入多个字符串key，返回key组成的对象
     * @param  {...any} args 参数
     */
    getItem (...args) {
      return getItem(this.type, args);
    },
    /**
     * 设置
     * 使用方式：
     *  1、setItem('key', 'value')， 即原有方式
     *  2、setItem({key1: value1,key2: value2,...})，即：key组成的对象，key1代表在storage中中的key
     * @param  {...any} args 参数
     */
    setItem (...args) {
      setItem(this.type, args);
    },
    /**
     * 删除
     * 使用方式：
     *  1、removeItem('key')， 即原有方式
     *  2、removeItem('key1', 'key2', ..)，即：输入多个字符串key，可以删除多个storage存储
     * @param  {...any} args 参数
     */
    removeItem (...args) {
      removeItem(this.type, args);
    },
    /**
     * 清空缓存
     */
    clear () {
      window[this.type].clear();
    },
    /**
     * 获取所有存储
     */
    getAll () {
      return getAllItems(this.type);
    }
  };
};

const MyStorage = {
  sessionStorage: build('sessionStorage'),
  localStorage: build('localStorage')
};

export default MyStorage;
