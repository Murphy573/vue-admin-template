import Cookies from 'js-cookie';
import { appendStoragePrefix, removeStoragePrefix } from './storage-prefix';

/* 具体传参请参考：https://www.npmjs.com/package/js-cookie */
export default {
  get (...args) {
    if (args.length) {
      args[0] = appendStoragePrefix(args[0]);
      return Cookies.get.apply(Cookies, args);
    }

    // 获取到所有cookie
    const All = Cookies.get();

    let final = {};

    Object.keys(All).forEach(key => {
      final[removeStoragePrefix(key)] = All[key];
    });

    return final;
  },
  getJSON (...args) {
    if (args.length) {
      args[0] = appendStoragePrefix(args[0]);
      return Cookies.getJSON.apply(Cookies, args);
    }

    // 获取到所有cookie
    const All = Cookies.getJSON();

    let final = {};

    Object.keys(All).forEach(key => {
      final[removeStoragePrefix(key)] = All[key];
    });

    return final;
  },
  set (...args) {
    if (args.length) {
      args[0] = appendStoragePrefix(args[0]);
    }
    return Cookies.set.apply(Cookies, args);
  },
  remove (...args) {
    if (args.length) {
      args[0] = appendStoragePrefix(args[0]);
    }
    return Cookies.remove.apply(Cookies, args);
  }
};
