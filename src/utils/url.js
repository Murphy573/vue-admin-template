import { isPlainObj } from './common';
/**
 * 获取url中指定的参数
 * @param {String} name 参数名
 * @param {String} url 传入的url
 * @returns {String} 参数值
 */
export function getUrlParam(name, url = null) {
  const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
  const r = url
    ? new URL(url).search.substr(1).match(reg)
    : window.location.search.substr(1).match(reg);
  if (r != null) return unescape(r[2]);
  return null;
}

/**
 * 将url中的参数转为object
 * @param {String} url url
 * @returns {Object}
 */
export function convertUrlParam2Obj(url) {
  const search = url.split('?')[1];
  if (!search) {
    return {};
  }
  const paramPairs = search.split('&');
  const finalObj = {};

  for (let pair of paramPairs) {
    // 因为存在base64参数（带有=号），所以获取第一个等号
    let equalFlagIndex = pair.indexOf('=');
    if (equalFlagIndex < 0) continue;
    const attr = pair.substring(0, equalFlagIndex);
    const value = pair.substring(equalFlagIndex + 1);
    finalObj[attr] = value;
  }
  return finalObj;
}

/**
 * 将对象转为url参数
 * @param {Object} obj 传入的对象
 */
export function convertObj2UrlParam(obj) {
  if (!obj) return '';
  return Object.keys(obj)
    .map((key) => {
      if (obj[key] === undefined) return '';
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    })
    .join('&');
}

/**
 * 拼接URL参数
 * @param {String} url url
 * @param {Object} paramObj 参数
 */
export function appendUrlParams(url, paramObj) {
  if (!url) return '';
  if (!paramObj || !isPlainObj(paramObj)) return url;

  const paramArr = [];
  for (const key in paramObj) {
    paramArr.push(`${key}=${paramObj[key]}`);
  }

  return url.includes('?')
    ? `${url}&${paramArr.join('&')}`
    : `${url}?${paramArr.join('&')}`;
}

/**
 * 删除url中指定的参数
 * @param {String} url 网址字符串
 * @param {Array<String>} params 参数名称列表
 */
export function deleteUrlParams(url, params) {
  if (!url || !Array.isArray(params)) return url;
  let paramIndex = url.indexOf('?');
  if (paramIndex === -1) {
    return url;
  }

  let searchParams = '&' + url.substring(paramIndex + 1);
  url = url.substring(0, paramIndex);

  params.forEach((item) => {
    let pattern = '&' + item + '=([^&]*)';
    if (searchParams.match(pattern)) {
      searchParams = searchParams.replace(searchParams.match(pattern)[0], '');
    }
  });
  searchParams =
    searchParams.indexOf('&') === 0 ? searchParams.substring(1) : searchParams;
  if (searchParams.length) {
    url += '?' + searchParams;
  }
  return url;
}
