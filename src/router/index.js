import { createRouter, createWebHistory } from 'vue-router'
import Portfolio from '../views/Portfolio.vue'

// 行銷頁面（獨立模組，懶載入）
const LandingPage = () => import('../marketing/LandingPage.vue')

const routes = [
  {
    path: '/',
    name: 'landing',
    component: LandingPage,
    meta: { title: '智能投資組合管理系統' }
  },
  {
    path: '/app',
    redirect: '/chin'
  },
  {
    path: '/:username',
    name: 'portfolio',
    component: Portfolio,
    meta: { title: '投資現況' }
  }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
