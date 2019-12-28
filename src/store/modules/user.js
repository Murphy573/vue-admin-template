import { loginByUsername, logout, getUserInfo } from '@/apis/login';
import { getToken, setToken, removeToken } from '@/utils/auth';

const user = {
  state: {
    userInfo: null,
    token: getToken() || '',
    // 角色
    roles: [],
    // 权限
    permissions: []
  },

  getters: {
    vx_gt_GetPermissions (state) {
      return state.permissions;
    },
    vx_gt_GetUserInfo (state) {
      return state.userInfo;
    },
    vx_gt_GetToken (state) {
      return state.token;
    }
  },

  mutations: {
    SET_USERINFO (state, userInfo = null) {
      state.userInfo = userInfo;
    },
    SET_TOKEN: (state, token) => {
      if (token) {
        setToken(token);
      }
      else {
        removeToken();
      }
      state.token = token || '';
    },
    SET_ROLES: (state, roles = []) => {
      state.roles = roles;
    },
    SET_PERMS: (state, permissions = []) => {
      state.permissions = permissions;
    }
  },

  actions: {
    // 重置用户state
    vx_ac_ResetUserStates ({ commit }) {
      commit('SET_TOKEN');
      commit('SET_ROLES');
      commit('SET_PERMS');
      commit('SET_USERINFO');
    },
    // 用户名登录
    vx_ac_LoginByUsername ({ commit }, userInfo) {
      const username = userInfo.username.trim();
      return new Promise((resolve, reject) => {
        loginByUsername(username, userInfo.password)
          .then(res => {
            commit('SET_TOKEN', res.token);
            resolve();
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    // 获取用户信息
    vx_ac_GetUserInfo ({ commit, state, dispatch }) {
      return new Promise((resolve, reject) => {
        getUserInfo(state.token)
          .then(res => {
            let _userInfo = {
              name: res.name,
              avatar: res.avatar
            };

            commit('SET_ROLES', res.roles);
            commit('SET_USERINFO', _userInfo);
            commit('SET_PERMS', res.perms);
            dispatch('vx_ac_GenerateMenus', res.perms);
            resolve(res);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    // 登出
    vx_ac_Logout ({ dispatch, state }) {
      return new Promise((resolve, reject) => {
        logout(state.token)
          .then(() => {
            dispatch('vx_ac_FrontendLogout');
            dispatch('vx_ac_ResetSidebarState');
            dispatch('vx_ac_ResetTagsViewState');
            resolve();
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    // 前端登出
    vx_ac_FrontendLogout ({ dispatch }) {
      dispatch('vx_ac_ResetUserStates');
    }
    // 动态修改权限
    // ChangeRoles ({ commit, dispatch }, role) {
    //   return new Promise(resolve => {
    //     commit('SET_TOKEN', role);
    //     setToken(role);
    //     getUserInfo(role).then(response => {
    //       const data = response.data;
    //       commit('SET_ROLES', data.roles);
    //       commit('SET_PERMS', data.perms);
    //       commit('SET_NAME', data.name);
    //       commit('SET_AVATAR', data.avatar);
    //       commit('SET_INTRODUCTION', data.introduction);
    //       dispatch('GenerateRoutes', data); // 动态修改权限后 重绘侧边菜单
    //       resolve();
    //     });
    //   });
    // }
  }
};

export default user;
