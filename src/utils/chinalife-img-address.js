/* 国寿图片域名与ip，port对应关系 */
import { isString } from '@/utils/common';

const IMG1_DOMAIN = process.env.VUE_APP_CHINALIFE_IMG1_DOMAIN || '';
const IMG1_IP_PORT = process.env.VUE_APP_CHINALIFE_IMG1_IP_PORT || '';
const IMG2_DOMAIN = process.env.VUE_APP_CHINALIFE_IMG2_DOMAIN || '';
const IMG2_IP_PORT = process.env.VUE_APP_CHINALIFE_IMG2_IP_PORT || '';
const IMG_JD_IP_PORT = process.env.VUE_APP_CHINALIFE_JD_IP_PORT || '';

// 是否是国寿环境
const isChinalife = !!(IMG1_IP_PORT || IMG2_IP_PORT);
const IMG1_DOMAIN_EXP = new RegExp(IMG1_DOMAIN, 'g');
const IMG2_DOMAIN_EXP = new RegExp(IMG2_DOMAIN, 'g');
const IMG1_IP_PORT_EXP = new RegExp(IMG1_IP_PORT, 'g');
const IMG2_IP_PORT_EXP = new RegExp(IMG2_IP_PORT, 'g');
const IMG_JD_DOMAIN_EXP = new RegExp(
  '(http(s)?:)?//img[0-9]+.360buyimg.com',
  'g'
);

/**
 * 国寿图片域名访问转换为ip、port访问
 * @param {String} src 图片地址
 */
const convertImgAddress = (src) => {
  try {
    if (!src || !isString(src)) return '';
    if (!isChinalife) return src;

    // 反转义
    src = decodeURIComponent(src);

    src = src.replace(IMG1_DOMAIN_EXP, IMG1_IP_PORT);
    src = src.replace(IMG2_DOMAIN_EXP, IMG2_IP_PORT);
    src = src.replace(IMG_JD_DOMAIN_EXP, IMG_JD_IP_PORT);

    return src;
  } catch (error) {
    return src;
  }
};

/**
 * 还原图片ip、port为国寿域名
 * @param {String} src 图片地址
 */
const revertImgAddress = (src) => {
  try {
    if (!src || !isString(src)) return '';
    if (!isChinalife) return src;

    // 反转义
    src = decodeURIComponent(src);

    src = src.replace(IMG1_IP_PORT_EXP, IMG1_DOMAIN);
    src = src.replace(IMG2_IP_PORT_EXP, IMG2_DOMAIN);

    return src;
  } catch (error) {
    return src;
  }
};

export { isChinalife, convertImgAddress, revertImgAddress };
