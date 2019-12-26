/* 商场管理 */
import LayoutMain from '@/views/layout/components/main';

export default {
  path: 'eg',
  component: LayoutMain,
  name: 'eg',
  meta: {
    icon: 'chart',
    menu: true,
    breadcrumb: 'eg',
    title: 'eg',
    forbiddenJump: true
  },
  children: [
    {
      path: 'eg1',
      component: () => import('@/views/eg/eg1'),
      name: 'eg1',
      meta: {
        menu: true,
        menuMapper: 'eg1',
        breadcrumb: 'eg1',
        title: 'eg1',
        perms: ['CODE2']
      }
    },
    {
      path: 'eg2',
      component: () => import('@/views/eg/eg2'),
      name: 'eg2',
      meta: {
        perms: ['CODE1', 'CODE2'],
        menu: true,
        menuMapper: 'eg2',
        breadcrumb: 'eg2',
        title: 'eg2',
        cached: 'Eg2'
      }
    },
    {
      path: 'eg3',
      component: () => import('@/views/eg/eg3'),
      name: 'eg3',
      meta: {
        menu: true,
        menuMapper: 'eg3',
        breadcrumb: 'eg3',
        title: 'eg3',
        forbiddenJump: true
      },
      children: [
        {
          path: 'eg33',
          component: () => import('@/views/eg/eg33/index'),
          name: 'eg33',
          meta: {
            menu: true,
            menuMapper: 'eg33',
            breadcrumb: 'eg33',
            title: 'eg33',
            perms: ['CODE1']
          }
        }
      ]
    }
  ]
};
