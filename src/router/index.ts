import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/** Login carrega de imediato (primeira rota); demais views em chunks separados. */
import LoginView from '../views/LoginView.vue'

const RegistrationInviteView = () => import('../views/RegistrationInviteView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const AssetsView = () => import('../views/AssetsView.vue')
const MovementsView = () => import('../views/MovementsView.vue')
const MaintenancesView = () => import('../views/MaintenancesView.vue')
const UsersView = () => import('../views/UsersView.vue')
const ReportsView = () => import('../views/ReportsView.vue')
const MyAssetsView = () => import('../views/MyAssetsView.vue')
const ApprovalsView = () => import('../views/ApprovalsView.vue')
const MyRequestsView = () => import('../views/MyRequestsView.vue')
const TechnicianTasksView = () => import('../views/TechnicianTasksView.vue')
const IntegrationsView = () => import('../views/IntegrationsView.vue')
const ForbiddenView = () => import('../views/ForbiddenView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login/:tenantSlug?',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/convite',
      name: 'registration-invite',
      component: RegistrationInviteView,
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/ativos', name: 'assets', component: AssetsView, meta: { requiresAuth: true, roles: ['ADM', 'GESTOR', 'TECNICO'] } },
    { path: '/meus-ativos', name: 'my-assets', component: MyAssetsView, meta: { requiresAuth: true, roles: ['GESTOR', 'TECNICO', 'FUNCIONARIO'] } },
    { path: '/movimentacoes', name: 'movements', component: MovementsView, meta: { requiresAuth: true, roles: ['ADM', 'GESTOR', 'TECNICO'] } },
    { path: '/manutencoes', name: 'maintenances', component: MaintenancesView, meta: { requiresAuth: true, roles: ['ADM', 'GESTOR', 'TECNICO'] } },
    { path: '/aprovacoes', name: 'approvals', component: ApprovalsView, meta: { requiresAuth: true, roles: ['ADM', 'GESTOR'] } },
    { path: '/solicitacoes', name: 'my-requests', component: MyRequestsView, meta: { requiresAuth: true } },
    { path: '/execucao-tecnica', name: 'technician-tasks', component: TechnicianTasksView, meta: { requiresAuth: true, roles: ['TECNICO'] } },
    { path: '/usuarios', name: 'users', component: UsersView, meta: { requiresAuth: true, roles: ['ADM', 'GESTOR'] } },
    { path: '/relatorios', name: 'reports', component: ReportsView, meta: { requiresAuth: true, roles: ['ADM', 'GESTOR'] } },
    { path: '/integracoes', name: 'integrations', component: IntegrationsView, meta: { requiresAuth: true, roles: ['ADM'] } },
    { path: '/acesso-negado', name: 'forbidden', component: ForbiddenView, meta: { requiresAuth: true } },
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
    const userRole = String(authStore.user.role ?? '').trim().toUpperCase()
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role ?? '').trim().toUpperCase())
    if (!normalizedAllowedRoles.includes(userRole)) {
      return { name: 'forbidden', query: { from: to.fullPath } }
    }
  }

  return true
})

export default router
