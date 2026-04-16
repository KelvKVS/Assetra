<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon-wrapper">
          <Box :size="28" :stroke-width="2.5" color="#3b82f6" />
        </div>
        <span class="logo-text">Assetra</span>
      </div>
      <p class="logo-subtitle">Gestão de Ativos</p>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <span class="nav-section-title">Menu</span>
        <RouterLink to="/dashboard" class="nav-item">
          <LayoutDashboard :size="20" :stroke-width="2" />
          <span>Dashboard</span>
        </RouterLink>
        <RouterLink v-if="isAdmin" to="/ativos" class="nav-item">
          <Monitor :size="20" :stroke-width="2" />
          <span>Ativos</span>
        </RouterLink>
        <RouterLink v-else-if="!isAdmin && !isManager && !isTechnician" to="/meus-ativos" class="nav-item">
          <Package :size="20" :stroke-width="2" />
          <span>Meus Ativos</span>
        </RouterLink>
        <RouterLink to="/movimentacoes" class="nav-item">
          <Repeat :size="20" :stroke-width="2" />
          <span>Movimentações</span>
        </RouterLink>
        <RouterLink to="/manutencoes" class="nav-item">
          <Wrench :size="20" :stroke-width="2" />
          <span>Manutenções</span>
        </RouterLink>
      </div>

      <div class="nav-section" v-if="isManager || isTechnician || isAdmin">
        <span class="nav-section-title">Gestão</span>
        <RouterLink v-if="isManager || isAdmin" to="/aprovacoes" class="nav-item">
          <CheckCircle :size="20" :stroke-width="2" />
          <span>Aprovações</span>
        </RouterLink>
        <RouterLink v-if="isTechnician || isAdmin" to="/execucao-tecnica" class="nav-item">
          <Settings :size="20" :stroke-width="2" />
          <span>Execução Técnica</span>
        </RouterLink>
      </div>

      <div class="nav-section" v-if="isAdmin">
        <span class="nav-section-title">Administração</span>
        <RouterLink to="/usuarios" class="nav-item">
          <Users :size="20" :stroke-width="2" />
          <span>Usuários</span>
        </RouterLink>
        <RouterLink to="/relatorios" class="nav-item">
          <BarChart3 :size="20" :stroke-width="2" />
          <span>Relatórios</span>
        </RouterLink>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" @click="$emit('toggle-theme')" aria-label="Alternar tema">
        <Sun v-if="isDark" :size="20" :stroke-width="2" />
        <Moon v-else :size="20" :stroke-width="2" />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
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
  Box
} from 'lucide-vue-next'

defineProps<{
  isDark: boolean
}>()

defineEmits(['toggle-theme'])

const authStore = useAuthStore()

const isAdmin = computed(() => authStore.user?.role === 'ADM')
const isManager = computed(() => authStore.user?.role === 'GESTOR')
const isTechnician = computed(() => authStore.user?.role === 'TECNICO')
</script>

<style scoped>
/* Estilos permanecem os mesmos */
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
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
}

.theme-toggle:hover {
  background: #374151;
  transform: scale(1.05);
}

@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
  }
}
</style>
