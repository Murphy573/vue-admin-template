export default {
  path: '/docPreview',
  name: 'docPreview',
  component: () => import('@/views/docPreview/index.vue'),
  meta: {
    isWhiteList: true,
    menuMapper: 'docPreview',
    breadcrumb: 'docPreview',
    title: 'docPreview',
  },
};
