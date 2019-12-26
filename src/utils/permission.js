import store from '@/store';

/**
 * @param {Array} value
 * @returns {Boolean}
 */
export default function checkPermission (value) {
  // 不传入值或者格式不对，不进行权限校验，就认为有权限
  if (!value || !Array.isArray(value)) return true;
  if (value.length > 0) {
    const perms = store.getters && store.getters.vx_gt_GetPermissions;
    const permissions = value;

    let hasPermission = false;

    if (perms.indexOf('*') >= 0) {
      hasPermission = true;
    }
    else {
      hasPermission = perms.some(perm => {
        return permissions.includes(perm);
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
