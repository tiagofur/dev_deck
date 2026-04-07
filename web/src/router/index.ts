import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/repo/:id',
      name: 'repo-detail',
      component: () => import('@/pages/RepoDetailPage.vue'),
      props: true,
    },
    {
      path: '/cheatsheets',
      name: 'cheatsheets',
      component: () => import('@/pages/CheatsheetsListPage.vue'),
    },
    {
      path: '/cheatsheets/:id',
      name: 'cheatsheet-detail',
      component: () => import('@/pages/CheatsheetDetailPage.vue'),
      props: true,
    },
    {
      path: '/discovery',
      name: 'discovery',
      component: () => import('@/pages/DiscoveryPage.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/pages/AuthCallbackPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const hasToken = !!getToken()

  if (to.meta.guest && hasToken) {
    return next({ name: 'home' })
  }

  if (!to.meta.guest && !hasToken && to.name !== 'login' && to.name !== 'auth-callback') {
    return next({ name: 'login' })
  }

  next()
})

export default router
