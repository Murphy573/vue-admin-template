// 缓存前缀
const StoragePrefix = process.env.VUE_APP_Storage_Prefix
  ? `${process.env.VUE_APP_Storage_Prefix}_`
  : '';
const StoragePrefixRegExp = new RegExp('^' + StoragePrefix);
// 拼接完整缓存key
export const appendStoragePrefix = (key) => `${StoragePrefix}${key}`;
// 删除缓存前缀key
export const removeStoragePrefix = (key) =>
  key.replace(StoragePrefixRegExp, '');
