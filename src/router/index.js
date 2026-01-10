import { createRouter, createWebHistory } from 'vue-router'
import Portfolio from '../views/Portfolio.vue'

const routes = [
  {
    path: '/:username',
    name: 'portfolio',
    component: Portfolio
  },
  {
    path: '/',
    redirect: '/chin'
  }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
