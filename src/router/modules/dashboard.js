export default {
  path: 'dashboard',
  component: () => import('@/views/dashboard/index'),
  name: 'dashboard',
  meta: {
    icon: 'dashboard',
    affix: true,
    menu: true,
    menuMapper: 'dashboard',
    breadcrumb: 'dashboard',
    title: 'dashboard'
  }
};
