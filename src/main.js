/* eslint-disable no-console */
// 引入element
import Element from 'element-ui';
import '@/styles/index.scss';

import Vue from 'vue';
import App from './App';
// 状态管理
import store from './store';
// 路由
import router from './router/index';
// 国际化
import i18n from './i18n';
// 路由拦截
import './router/router-event';

import './icons'; // icon
import './directive';
// 引入全局filter
import './filters';

Vue.use(Element, { size: 'small', zIndex: 3000 });

Vue.config.productionTip = false;

Vue.config.errorHandler = (err, vm, info) => {
  console.log(err);
  console.log(vm);
  console.log(info);
  console.log(formatComponentName(vm));
};

function formatComponentName(vm) {
  if (vm.$root === vm) return 'root';
  let name = vm._isVue
    ? (vm.$options && vm.$options.name) ||
      (vm.$options && vm.$options._componentTag)
    : vm.name;
  return (
    (name ? 'component <' + name + '>' : 'anonymous component') +
    (vm._isVue && vm.$options && vm.$options.__file
      ? ' at ' + (vm.$options && vm.$options.__file)
      : '')
  );
}

new Vue({
  el: '#app',
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
