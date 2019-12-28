import axios from 'axios';
import { Message, MessageBox } from 'element-ui';
import { isString } from './common';
import store from '@/store';
import {
  TOKEN_TIMEOUT,
  SUCCESS,
  CODE502,
  CODE503,
  CODE504,
  CODE505,
  CODE506,
  FORBIDDEN_TOAST_CODES
} from '../configs/http-code';

// 设置http get请求不缓存
axios.defaults.headers.get['Cache-Control'] = 'no-cache';
axios.defaults.headers.get['Pragma'] = 'no-cache';

const http = axios.create({
  baseURL: '',
  // 超时毫秒数
  timeout: 10000
});

/**
 * 请求出错的消息提示
 * @param {String} msg 错误消息
 */
function showErrorMessage (msg, type = 'error') {
  Message({
    message: msg,
    type: type,
    duration: 4 * 1000
  });
}

/**
 * 拼接token
 * @param {String} url 请求路径
 */
function appendToken (url) {
  if (!url || !isString(url)) return url;
  if (url.indexOf('?') > -1) {
    url = `${url}&token=${store.getters.vx_gt_GetToken}`;
  }
  else {
    url = `${url}?token=${store.getters.vx_gt_GetToken}`;
  }
  return url;
}

// 请求前进行拦截
http.interceptors.request.use(
  config => {
    config.url = appendToken(config.url);
    // 在这里对config进行统一处理
    return config;
  },
  error => {
    Promise.reject(error);
  }
);

/**
 * 响应后进行统一拦截
 * 假如后台返回的数据对象为：
 *    {
        code: string;
        content: any;
        message: string,
      }
 */
http.interceptors.response.use(
  res => {
    // 屏蔽导出时的错误信息提示，默认resolve
    if (res.config.responseType === 'arraybuffer') {
      return Promise.resolve(res.content);
    }

    let _res = res.data;
    if (_res.code !== SUCCESS) {
      // 禁止弹出的code不作处理
      if (FORBIDDEN_TOAST_CODES.includes(_res.code)) {
      }
      // 这里对具体不为成功的响应码进行处理,可以做提示信息操作
      else if (_res.code === TOKEN_TIMEOUT) {
        MessageBox.alert('系统未登录，请重新登录', '错误', {
          confirmButtonText: '确定',
          type: 'error'
        })
          .then(() => {
            store.dispatch('vx_ac_FrontendLogout').then(() => {
              location.reload();
            });
          })
          .catch(error => {});
        return Promise.reject(new Error('系统未登录，请重新登录'));
      }
      else if (_res.code === CODE502) {
        showErrorMessage('系统内部错误，请联系管理员维护');
      }
      else if (_res.code === CODE503) {
        showErrorMessage('请求业务目前未支持', 'warning');
      }
      else if (_res.code === CODE504) {
        showErrorMessage('更新数据已经失效，请刷新页面重新操作', 'warning');
      }
      else if (_res.code === CODE505) {
        showErrorMessage('更新失败，请再尝试一次', 'warning');
      }
      else if (_res.code === CODE506) {
        showErrorMessage('没有操作权限，请联系管理员授权', 'warning');
      }
      else {
        showErrorMessage(_res.message);
      }
      return Promise.reject(_res);
    }
    else {
      return Promise.resolve(_res.content);
    }
  },
  error => {
    showErrorMessage(error.message);
    return Promise.reject(error);
  }
);

export default http;
