import store from '@/store';

/**
 * @param {Array} value
 * @returns {Boolean}
 */
export default function checkPermission (perms) {
  // 不传入值或者格式不对，不进行权限校验，就认为有权限
  if (!perms || !Array.isArray(perms)) return true;
  if (perms.length > 0) {
    const permissions = store.getters && store.getters.vx_gt_GetPermissions;

    let hasPermission = false;

    if (permissions.indexOf('*') >= 0) {
      hasPermission = true;
    }
    else {
      hasPermission = permissions.some(perm => {
        return perms.includes(perm);
      });
    }

    if (!hasPermission) {
      return false;
    }
    return true;
  }
  else {
    return false;
  }
}
