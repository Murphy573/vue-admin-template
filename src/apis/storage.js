import http from '@/utils/http';

export function api_query_storageList (query) {
  return http({
    url: '/storage/list',
    method: 'get',
    params: query
  });
}

export function api_create_storage (data) {
  return http({
    url: '/storage/create',
    method: 'post',
    data
  });
}

export function readStorage (data) {
  return http({
    url: '/storage/read',
    method: 'get',
    data
  });
}

export function api_update_storage (data) {
  return http({
    url: '/storage/update',
    method: 'post',
    data
  });
}

export function api_delete_storage (data) {
  return http({
    url: '/storage/delete',
    method: 'post',
    data
  });
}

const uploadPath = process.env.VUE_APP_Api_Prefix + '/storage/create';
export { uploadPath };
