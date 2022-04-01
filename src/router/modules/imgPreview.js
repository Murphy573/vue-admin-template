export default {
  path: '/imgPreview',
  name: 'imgPreview',
  component: () => import('@/views/imgPreview/index'),
  meta: {
    isWhiteList: true,
    menuMapper: 'imgPreview',
    breadcrumb: 'imgPreview',
    title: 'imgPreview',
  },
};
