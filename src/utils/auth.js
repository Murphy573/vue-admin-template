import MyStorage from './storage';

const TokenKey = 'ADMIN_TOKEN';

export function getToken () {
  return MyStorage.sessionStorage.getItem(TokenKey);
}

export function setToken (token) {
  return MyStorage.sessionStorage.setItem(TokenKey, token);
}

export function removeToken () {
  return MyStorage.sessionStorage.removeItem(TokenKey);
}
