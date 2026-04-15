<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <aside v-if="authStore.isAuthenticated" class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon-wrapper">
            <Box size="28" color="#3b82f6" />
          </div>
          <span class="logo-text">Assetra</span>
        </div>
        <p class="logo-subtitle">Gestão de Ativos</p>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-title">Menu</span>
          <RouterLink to="/dashboard" class="nav-item">
            <LayoutDashboard size="20" />
            <span>Dashboard</span>
          </RouterLink>
          <RouterLink v-if="isAdmin" to="/ativos" class="nav-item">
            <Monitor size="20" />
            <span>Ativos</span>
          </RouterLink>
          <RouterLink v-else to="/meus-ativos" class="nav-item">
            <Package size="20" />
            <span>Meus Ativos</span>
          </RouterLink>
          <RouterLink to="/movimentacoes" class="nav-item">
            <Repeat size="20" />
            <span>Movimentações</span>
          </RouterLink>
          <RouterLink to="/manutencoes" class="nav-item">
            <Wrench size="20" />
            <span>Manutenções</span>
          </RouterLink>
        </div>

        <div class="nav-section" v-if="isManager || isTechnician || isAdmin">
          <span class="nav-section-title">Gestão</span>
          <RouterLink v-if="isManager" to="/aprovacoes" class="nav-item">
            <CheckCircle size="20" />
            <span>Aprovações</span>
          </RouterLink>
          <RouterLink v-if="isTechnician" to="/execucao-tecnica" class="nav-item">
            <Settings size="20" />
            <span>Execução Técnica</span>
          </RouterLink>
        </div>

        <div class="nav-section" v-if="isAdmin">
          <span class="nav-section-title">Administração</span>
          <RouterLink to="/usuarios" class="nav-item">
            <Users size="20" />
            <span>Usuários</span>
          </RouterLink>
          <RouterLink to="/relatorios" class="nav-item">
            <BarChart3 size="20" />
            <span>Relatórios</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="theme-toggle" @click="toggleTheme" aria-label="Alternar tema">
          <Sun v-if="isDark" size="20" />
          <Moon v-else size="20" />
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="main-wrapper">
      <!-- Topbar -->
      <header v-if="authStore.isAuthenticated" class="topbar">
        <div class="topbar-left">
          <h1 class="page-title">{{ currentPageTitle }}</h1>
        </div>
        <div class="topbar-right">
          <div class="search-box">
            <input type="text" placeholder="Buscar..." class="search-input" />
            <Search class="search-icon" size="16" />
          </div>
          <div v-if="authStore.user" class="user-profile">
            <div class="user-avatar">{{ userInitial }}</div>
            <div class="user-info">
              <strong>{{ authStore.user.name }}</strong>
              <small>{{ authStore.user.profile }}</small>
            </div>
            <button class="logout-btn" @click="handleLogout" title="Sair">
              <LogOut size="18" />
            </button>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

// Lucide Icons
import {
  LayoutDashboard,
  Monitor,
  Package,
  Repeat,
  Wrench,
  CheckCircle,
  Settings,
  Users,
  BarChart3,
  Sun,
  Moon,
  Search,
  LogOut,
  Box
} from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const isDark = ref(true)
const isAdmin = computed(() => authStore.user?.profile === 'Administrador')
const isManager = computed(() => authStore.user?.profile === 'Gestor')
const isTechnician = computed(() => authStore.user?.profile === 'Técnico')
const userInitial = computed(() => authStore.user?.name?.charAt(0).toUpperCase() ?? 'U')

const currentPageTitle = computed(() => {
  const path = route.path
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/ativos': 'Ativos de TI',
    '/meus-ativos': 'Meus Ativos',
    '/movimentacoes': 'Movimentações',
    '/manutencoes': 'Manutenções',
    '/aprovacoes': 'Aprovações',
    '/execucao-tecnica': 'Execução Técnica',
    '/usuarios': 'Usuários',
    '/relatorios': 'Relatórios',
  }
  return titles[path] || 'Dashboard'
})

const applyTheme = (dark: boolean) => {
  isDark.value = dark
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('assetra-theme', dark ? 'dark' : 'light')
}

const toggleTheme = () => {
  applyTheme(!isDark.value)
}

const handleLogout = async () => {
  await authStore.logout()
  await router.push('/login')
}

onMounted(() => {
  const storedTheme = localStorage.getItem('assetra-theme')
  applyTheme(storedTheme === 'dark')
})
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #0f172a;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: #111827;
  border-right: 1px solid #1f2937;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #1f2937;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.logo-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
}

.logo-text {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}

.logo-subtitle {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  padding-left: 48px;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 20px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #9ca3af;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.nav-item svg {
  flex-shrink: 0;
  color: currentColor;
}

.nav-item:hover {
  background: #1f2937;
  color: #fff;
}

.nav-item.router-link-active {
  background: #1f2937;
  color: #fff;
  border-left-color: #3b82f6;
  font-weight: 600;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid #1f2937;
  display: flex;
  justify-content: flex-end;
}

.theme-toggle {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
}

.theme-toggle:hover {
  background: #374151;
  transform: scale(1.05);
}

/* Main Wrapper */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Quando há sidebar, aplica margem */
.app-shell:has(.sidebar) .main-wrapper {
  margin-left: 260px;
}

/* Quando não há sidebar (login), centraliza conteúdo */
.app-shell:not(:has(.sidebar)) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-shell:not(:has(.sidebar)) .main-wrapper {
  margin-left: 0;
  width: 100%;
}

/* Topbar */
.topbar {
  background: #111827;
  border-bottom: 1px solid #1f2937;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.search-box {
  position: relative;
}

.search-input {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 10px 16px 10px 40px;
  font-size: 14px;
  color: #fff;
  width: 280px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #6b7280;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1f2937;
  border-radius: 12px;
  border: 1px solid #374151;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: #fff;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-info strong {
  font-size: 14px;
  color: #fff;
}

.user-info small {
  font-size: 12px;
  color: #9ca3af;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #374151;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
}

.logout-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
  transform: scale(1.05);
  color: #fff;
}

/* Content */
.content {
  flex: 1;
  padding: 32px;
  background: #0f172a;
}

/* Responsive */
@media (max-width: 1024px) {
  /* Quando há sidebar em telas médias, esconde sidebar */
  .app-shell:has(.sidebar) .sidebar {
    transform: translateX(-100%);
  }
  
  .app-shell:has(.sidebar) .main-wrapper {
    margin-left: 0;
  }

  .search-input {
    width: 200px;
  }
}

@media (max-width: 768px) {
  .topbar {
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .topbar-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-input {
    width: 100%;
  }
  
  .user-info {
    display: none;
  }
  
  .content {
    padding: 20px;
  }
}
</style>
