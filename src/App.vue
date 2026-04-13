<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-head">
        <div class="brand-block">
          <h1>Assetra</h1>
          <p>Gestão corporativa de ativos de tecnologia</p>
        </div>
        <div class="topbar-actions">
          <button class="theme-btn" @click="toggleTheme">
            {{ isDark ? 'Tema claro' : 'Tema escuro' }}
          </button>
          <div v-if="authStore.user" class="user-pill">
            <span class="user-initial">{{ userInitial }}</span>
            <div class="user-meta">
              <strong>{{ authStore.user.name }}</strong>
              <small>{{ authStore.user.profile }}</small>
            </div>
          </div>
        </div>
      </div>
      <nav v-if="authStore.isAuthenticated" class="topnav">
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <RouterLink v-if="isAdmin" to="/ativos">Ativos</RouterLink>
        <RouterLink v-else to="/meus-ativos">Meus Ativos</RouterLink>
        <RouterLink to="/movimentacoes">Movimentações</RouterLink>
        <RouterLink to="/manutencoes">Manutenções</RouterLink>
        <RouterLink v-if="isManager" to="/aprovacoes">Aprovações</RouterLink>
        <RouterLink v-if="isTechnician" to="/execucao-tecnica">Execução Técnica</RouterLink>
        <RouterLink v-if="isAdmin" to="/usuarios">Usuários</RouterLink>
        <RouterLink v-if="isAdmin || isManager" to="/relatorios">Relatórios</RouterLink>
      </nav>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()
const isDark = ref(false)
const THEME_KEY = 'assetra-theme'
const isAdmin = computed(() => authStore.user?.profile === 'Administrador')
const isManager = computed(() => authStore.user?.profile === 'Gestor')
const isTechnician = computed(() => authStore.user?.profile === 'Técnico')
const userInitial = computed(() => authStore.user?.name?.charAt(0).toUpperCase() ?? 'U')

const applyTheme = (dark: boolean) => {
  isDark.value = dark
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
}

const toggleTheme = () => {
  applyTheme(!isDark.value)
}

onMounted(() => {
  const storedTheme = localStorage.getItem(THEME_KEY)
  applyTheme(storedTheme === 'dark')
})
</script>
