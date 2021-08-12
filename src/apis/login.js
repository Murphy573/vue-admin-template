export function api_login_byUsername (username, password) {
  return Promise.resolve({
    token: Math.random()
  });
}

export function api_logout () {
  return Promise.resolve(true);
}

export function api_get_userInfo () {
  return Promise.resolve({
    roles: ['随便'],
    name: 'xxxx',
    // *只所有权限
    privilegeCodes: ['CODE1'],
    avatar:
      'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif'
  });
}
