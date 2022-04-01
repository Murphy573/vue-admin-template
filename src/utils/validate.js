import Vue from 'vue';

/**
 * @param {string} path
 * @returns {Boolean}
 */
export function isExternal(path) {
  return /^(https?:|mailto:|tel:)/.test(path);
}

/**
 * @param {string} url
 * @returns {Boolean}
 */
export function validURL(url) {
  const reg =
    /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
  return reg.test(url);
}

/**
 * 创建上传文件校验
 * @param {Array<String>} accepts 接受的文件后缀名列表
 * @param {Number} size 文件大小限制
 */
export function createUploadValid(accepts = ['*'], size = 5) {
  return function (file) {
    const _accepts = accepts || [];
    // 文件类型校验
    const isAccept = _accepts.includes('*')
      ? true
      : _accepts.includes(
          file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
        );
    // 文件大小校验
    const isLimit = file.size / 1024 <= size * 1024;

    if (!isAccept) {
      Vue.prototype.$message.error(`请上传 ${accepts.join('、')} 文件`);
    }
    if (!isLimit) {
      Vue.prototype.$message.error(`文件大小不要超过 ${size}M`);
    }
    return isAccept && isLimit;
  };
}
