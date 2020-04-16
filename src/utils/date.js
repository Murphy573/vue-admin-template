/**
 * 日期转换
 * @param {Number|Date|String} time 时间
 * @param {String} ftm 转换格式
 *  转换格式有：
 *    YYYY: 年
 *    MM: 月
 *    DD: 日
 *    HH: 小时
 *    mm: 分钟
 *    ss: 秒
 */
export function formatDate (time, fmt = 'YYYY-MM-DD') {
  if (!time) return '';
  if (typeof time === 'string') {
    time = time.replace(/-/g, '/');
  }
  let _time = new Date(time);
  let o = {
    'M+': _time.getMonth() + 1, // 月份
    'D+': _time.getDate(), // 日
    'H+': _time.getHours(), // 小时
    'm+': _time.getMinutes(), // 分
    's+': _time.getSeconds(), // 秒
    'q+': Math.floor((_time.getMonth() + 3) / 3), // 季度
    S: _time.getMilliseconds() // 毫秒
  };
  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (_time.getFullYear() + '').substr(4 - RegExp.$1.length)
    );
  }
  for (let k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      );
    }
  }
  return fmt;
}

/**
 * 获取当月有多少天
 * @param {String | Number | Date} time 日期
 */
export function getCurrentMonthDays (time) {
  let _time = new Date(time);
  return new Date(_time.getFullYear(), _time.getMonth() + 1, 0).getDate();
}

/**
 * 获取两个日期的相差天数
 * @param {String | Number | Date} date1 开始日期
 * @param {String | Number | Date} date2 结束日期
 */
export function getDiffDays (date1, date2) {
  if (!date1 || !date2) {
    return -1;
  }
  let _d1 = new Date(date1).getTime(),
    _d2 = new Date(date2).getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000; // 一天的毫秒数
  return Math.abs(Math.floor((_d2 - _d1) / ONE_DAY));
}

/**
 *  获取当前日期是星期几
 * @param {String | Number | Date} time 日期
 * @param {String} prefix 前缀
 */
export function getWeekDay (time, prefix = '星期') {
  if (!time) {
    return '';
  }
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  return `${prefix}${week[new Date(time).getDay()]}`;
}
