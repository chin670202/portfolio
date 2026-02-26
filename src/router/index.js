import { createRouter, createWebHistory } from 'vue-router'
import Portfolio from '../views/Portfolio.vue'

const LandingPage = () => import('../marketing/LandingPage.vue')
const SidebarLayout = () => import('../layouts/SidebarLayout.vue')
const TradeDashboardPage = () => import('../views/TradeDashboardPage.vue')
const TradesPage = () => import('../views/TradesPage.vue')
const PnlPage = () => import('../views/PnlPage.vue')

const routes = [
  {
    path: '/',
    name: 'landing',
    component: LandingPage,
    meta: { title: '智能投資組合管理系統' }
  },
  {
    path: '/app',
    redirect: '/demo'
  },
  {
    path: '/:username',
    component: SidebarLayout,
    children: [
      {
        path: '',
        name: 'portfolio',
        component: Portfolio,
        meta: { title: '投資現況' }
      },
      {
        path: 'dashboard',
        name: 'trade-dashboard',
        component: TradeDashboardPage,
        meta: { title: '交易儀表板' }
      },
      {
        path: 'trades',
        name: 'trades',
        component: TradesPage,
        meta: { title: '交易紀錄' }
      },
      {
        path: 'pnl',
        name: 'pnl',
        component: PnlPage,
        meta: { title: '損益報表' }
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
