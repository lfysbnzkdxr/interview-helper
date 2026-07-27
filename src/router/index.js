import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Practice',
    meta: { title: '随机练题' },
    component: () => import('../views/PracticeView.vue'),
  },
  {
    path: '/browse',
    name: 'Browse',
    meta: { title: '分类浏览' },
    component: () => import('../views/BrowseView.vue'),
  },
  {
    path: '/create',
    name: 'Create',
    meta: { title: '创建问答' },
    component: () => import('../views/CreateView.vue'),
  },
  {
    path: '/bank',
    name: 'Bank',
    meta: { title: '题库管理' },
    component: () => import('../views/BankView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    meta: { title: '设置' },
    component: () => import('../views/SettingsView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由切换时更新页面标题
const SITE_NAME = 'AI 面试备题'
router.afterEach((to) => {
  const title = to.meta?.title
  document.title = title ? `${title} - ${SITE_NAME}` : SITE_NAME
})

export default router
