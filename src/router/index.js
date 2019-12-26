import Vue from 'vue';
import Router from 'vue-router';
import Base from './modules/base';
import RouterConfig from './router-config';

Vue.use(Router);

/**
* meta : {
    perms: ['GET /aaa','POST /bbb']   权限列表，如果不设置，则视为不需要权限
    title: 'title'                    左侧菜单i18n对应的属性码
    icon: 'svg-name'                  左侧菜单项的图标,一般作用于父菜单
    cached: 'ComponentName'           控制页面缓存，值为路由组件name,不定义则不缓存
    menuMapper: 'routername'          映射的菜单name，激活菜单选中
    breadcrumb： 'breadcrumb'         面包屑i18对应的属性码，不定义则不生成面包屑
    menu: true                        该路由是否是菜单，true则根据权限生成菜单
    showTag: false                    该路由是否生成tag，不设置默认是true
    affix: true                       则该tag不能关闭
    forbiddenJump: true               则该路由不能跳转，一般作用域父路由
    isWhiteList: true                 该路由是否绕过权限和登录验证
  }
**/
export default new Router({
  mode: 'history',
  routes: [
    ...Base,
    {
      path: '/layout',
      name: 'layout',
      component: () => import('@/views/layout/index'),
      children: [
        {
          path: '/redirect',
          name: 'redirect',
          component: () => import('@/views/redirect/index'),
          meta: {
            showTag: false
          }
        },
        ...RouterConfig
      ]
    },
    {
      path: '*',
      redirect: { name: 'login', replace: true }
    }
  ]
});
