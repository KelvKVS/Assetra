<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1 class="page-title">{{ title }}</h1>
    </div>
    <div class="topbar-right">
      <div class="search-box">
        <input type="text" placeholder="Buscar..." class="search-input" />
        <Search class="search-icon" :size="16" />
      </div>
      <div v-if="authStore.user" class="user-profile">
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-info">
          <strong>{{ authStore.user.name }}</strong>
          <small>{{ roleLabel }}</small>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Sair">
          <LogOut :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { Search, LogOut } from 'lucide-vue-next'

defineProps<{
  title: string
}>()

const authStore = useAuthStore()
const router = useRouter()

const userInitial = computed(() => authStore.user?.name?.charAt(0).toUpperCase() ?? 'U')

const roleLabel = computed(() => {
  const roles: Record<string, string> = {
    'ADM': 'Administrador',
    'GESTOR': 'Gestor',
    'TECNICO': 'Técnico'
  }
  return roles[authStore.user?.role || ''] || 'Usuário'
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
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
}
</style>
