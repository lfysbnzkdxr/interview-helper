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
    path: '/submit',
    name: 'Submit',
    component: () => import('../views/SubmitView.vue'),
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('../views/ReviewView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
