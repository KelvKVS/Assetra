import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import AssetsView from '../views/AssetsView.vue'
import MovementsView from '../views/MovementsView.vue'
import MaintenancesView from '../views/MaintenancesView.vue'
import UsersView from '../views/UsersView.vue'
import ReportsView from '../views/ReportsView.vue'
import MyAssetsView from '../views/MyAssetsView.vue'
import ApprovalsView from '../views/ApprovalsView.vue'
import TechnicianTasksView from '../views/TechnicianTasksView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/ativos', name: 'assets', component: AssetsView, meta: { requiresAuth: true, roles: ['Administrador'] } },
    { path: '/meus-ativos', name: 'my-assets', component: MyAssetsView, meta: { requiresAuth: true, roles: ['Gestor', 'Técnico'] } },
    { path: '/movimentacoes', name: 'movements', component: MovementsView, meta: { requiresAuth: true } },
    { path: '/manutencoes', name: 'maintenances', component: MaintenancesView, meta: { requiresAuth: true } },
    { path: '/aprovacoes', name: 'approvals', component: ApprovalsView, meta: { requiresAuth: true, roles: ['Gestor'] } },
    { path: '/execucao-tecnica', name: 'technician-tasks', component: TechnicianTasksView, meta: { requiresAuth: true, roles: ['Técnico'] } },
    { path: '/usuarios', name: 'users', component: UsersView, meta: { requiresAuth: true, roles: ['Administrador'] } },
    { path: '/relatorios', name: 'reports', component: ReportsView, meta: { requiresAuth: true, roles: ['Administrador', 'Gestor'] } },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.bootstrapped) {
    await authStore.fetchMe()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.roles && authStore.user) {
    const allowedRoles = to.meta.roles as string[]
    if (!allowedRoles.includes(authStore.user.profile)) {
      return { name: 'dashboard' }
    }
  }

  return true
})

export default router
