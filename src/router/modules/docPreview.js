export default {
  path: '/docPreview',
  name: 'docPreview',
  component: () => import('@/views/docPreview/index'),
  meta: {
    isWhiteList: true,
    menuMapper: 'docPreview',
    breadcrumb: 'docPreview',
    title: 'docPreview',
  },
};
