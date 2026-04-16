<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <Sidebar 
      v-if="authStore.isAuthenticated" 
      :is-dark="isDark" 
      @toggle-theme="toggleTheme" 
    />

    <!-- Main Content -->
    <div class="main-wrapper">
      <!-- Topbar -->
      <Topbar 
        v-if="authStore.isAuthenticated" 
        :title="currentPageTitle" 
      />

      <!-- Content -->
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'

const authStore = useAuthStore()
const route = useRoute()
const isDark = ref(true)

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

onMounted(async () => {
  const storedTheme = localStorage.getItem('assetra-theme')
  applyTheme(storedTheme !== 'light')
  
  if (!authStore.bootstrapped) {
    await authStore.fetchMe()
  }
})
</script>

<style>
/* Estilos Globais e Reset */
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #111827;
  --bg-tertiary: #1f2937;
  --bg-card: #1e293b;
  --bg-hover: #334155;
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --text-muted: #64748b;
  --accent-color: #3b82f6;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-light: rgba(59, 130, 246, 0.1);
  --success: #22c55e;
  --success-light: rgba(34, 197, 94, 0.1);
  --warning: #f59e0b;
  --warning-light: rgba(245, 158, 11, 0.1);
  --danger: #ef4444;
  --danger-light: rgba(239, 68, 68, 0.1);
  --info: #06b6d4;
  --border-color: #1f2937;
  --border-light: #334155;
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

[data-theme='light'] {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --bg-card: #ffffff;
  --bg-hover: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --accent-color: #2563eb;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: rgba(37, 99, 235, 0.1);
  --success: #16a34a;
  --success-light: rgba(22, 163, 74, 0.1);
  --warning: #d97706;
  --warning-light: rgba(217, 119, 6, 0.1);
  --danger: #dc2626;
  --danger-light: rgba(220, 38, 38, 0.1);
  --info: #0891b2;
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

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
  justify-content: center;
}

.app-shell:not(:has(.sidebar)) .main-wrapper {
  margin-left: 0;
  width: 100%;
}

.content {
  flex: 1;
  padding: 32px;
  background: var(--bg-primary);
}

@media (max-width: 1024px) {
  .app-shell:has(.sidebar) .main-wrapper {
    margin-left: 0;
  }
}
</style>
