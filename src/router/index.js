import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Practice',
    component: () => import('../views/PracticeView.vue'),
  },
  {
    path: '/browse',
    name: 'Browse',
    component: () => import('../views/BrowseView.vue'),
  },
  {
    path: '/create',
    name: 'Create',
    component: () => import('../views/CreateView.vue'),
  },
  {
    path: '/bank',
    name: 'Bank',
    component: () => import('../views/BankView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
