export default {
  path: '/richtext',
  name: 'richtext',
  component: () => import('@/views/richtext/index'),
  meta: {
    isWhiteList: true,
    menuMapper: 'richtext',
    breadcrumb: 'richtext',
    title: 'richtext',
  },
};
