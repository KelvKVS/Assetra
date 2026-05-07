<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="menu-btn"
        type="button"
        aria-label="Abrir menu"
        @click="sidebar.toggle"
      >
        <Menu :size="22" :stroke-width="2.5" />
      </button>
      <h1 class="page-title">{{ title }}</h1>
    </div>
    <div class="topbar-right">
      <div class="search-box">
        <input type="text" placeholder="Buscar..." class="search-input" />
        <Search class="search-icon" :size="16" />
      </div>
      <div v-if="authStore.user" class="user-profile">
        <div class="notifications" ref="notificationsRef">
          <button
            class="notif-btn"
            type="button"
            @click="toggleNotifications"
            aria-label="Abrir notificações"
          >
            <Bell :size="18" />
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
          </button>
          <div v-if="notificationsOpen" class="notif-dropdown">
            <div class="notif-header">
              <strong>Notificações</strong>
              <small>{{ unreadCount }} novas</small>
            </div>
            <button
              v-for="notification in notifications"
              :key="notification.id"
              class="notif-item"
              type="button"
              @click="openNotification(notification)"
            >
              <div class="notif-title">{{ notification.title }}</div>
              <div class="notif-meta">
                <span>De: {{ notification.sender }}</span>
                <span>{{ notification.timeLabel }}</span>
              </div>
            </button>
            <p v-if="notifications.length === 0" class="notif-empty">Sem novidades no momento.</p>
          </div>
        </div>
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-info">
          <strong>{{ authStore.user.name }}</strong>
          <small class="user-meta">{{ roleLabel }}<template v-if="authStore.user.tenant"> · {{ authStore.user.tenant.name }}</template></small>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Sair">
          <LogOut :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import { roleLabelPt } from '../utils/roleLabels'
import { useSidebar } from '../composables/useSidebar'
import { Search, LogOut, Menu, Bell } from 'lucide-vue-next'

const sidebar = useSidebar()

defineProps<{
  title: string
}>()

const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const router = useRouter()
const notificationsOpen = ref(false)
const notificationsRef = ref<HTMLElement | null>(null)
let notificationsTimer: ReturnType<typeof setInterval> | null = null
const readNotificationIds = ref<string[]>([])

type UiNotification = {
  id: string
  title: string
  sender: string
  timeLabel: string
  timestamp: number
  route: string
}

const userInitial = computed(() => authStore.user?.name?.charAt(0).toUpperCase() ?? 'U')

const roleLabel = computed(() => roleLabelPt(authStore.user?.role))
const canApprove = computed(() => ['ADM', 'GESTOR'].includes(String(authStore.user?.role ?? '').trim().toUpperCase()))

const notifications = computed<UiNotification[]>(() => {
  const items: UiNotification[] = []
  const role = authStore.user?.role

  if (role === 'ADM' || role === 'GESTOR') {
    for (const approval of inventoryStore.approvals.filter((a) => a.status === 'Pendente')) {
      items.push({
        id: `approval-pending-${approval.id}`,
        title: `${approval.type} pendente: ${approval.assetTag}`,
        sender: approval.requestedByName || 'Utilizador',
        timeLabel: formatDateTime(approval.createdAt),
        timestamp: parseDate(approval.createdAt),
        route: '/aprovacoes',
      })
    }
  }

  for (const approval of inventoryStore.myApprovals.filter((a) => a.status !== 'Pendente')) {
    items.push({
      id: `approval-mine-${approval.id}`,
      title: `Solicitação ${approval.status.toLowerCase()}: ${approval.assetTag}`,
      sender: approval.decidedByName || 'Gestão',
      timeLabel: formatDateTime(approval.decidedAt || approval.createdAt),
      timestamp: parseDate(approval.decidedAt || approval.createdAt),
      route: '/solicitacoes',
    })
  }

  return items
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
})

const unreadCount = computed(
  () => notifications.value.filter((n) => !readNotificationIds.value.includes(n.id)).length,
)

const readStorageKey = computed(() => `assetra-read-notifications:${authStore.user?.id ?? 'guest'}`)

function formatDateTime(raw?: string | null) {
  if (!raw) return 'agora'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return 'agora'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseDate(raw?: string | null) {
  if (!raw) return Date.now()
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime()
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) markAllAsRead()
}

function openNotification(notification: UiNotification) {
  notificationsOpen.value = false
  router.push(notification.route)
}

function onClickOutside(event: MouseEvent) {
  if (!notificationsRef.value) return
  const target = event.target as Node | null
  if (target && !notificationsRef.value.contains(target)) {
    notificationsOpen.value = false
  }
}

function persistReadState() {
  try {
    localStorage.setItem(readStorageKey.value, JSON.stringify(readNotificationIds.value))
  } catch {
    /* ignore */
  }
}

function loadReadState() {
  try {
    const raw = localStorage.getItem(readStorageKey.value)
    if (!raw) {
      readNotificationIds.value = []
      return
    }
    const parsed = JSON.parse(raw)
    readNotificationIds.value = Array.isArray(parsed) ? parsed : []
  } catch {
    readNotificationIds.value = []
  }
}

function markAllAsRead() {
  const allIds = notifications.value.map((n) => n.id)
  readNotificationIds.value = Array.from(new Set([...readNotificationIds.value, ...allIds]))
  persistReadState()
}

onMounted(async () => {
  document.addEventListener('click', onClickOutside)
  if (!authStore.isAuthenticated) return
  loadReadState()
  const refreshNotifications = async () => {
    if (canApprove.value) {
      await Promise.allSettled([inventoryStore.fetchApprovalsSafe(), inventoryStore.fetchMyApprovalsSafe()])
      return
    }
    await inventoryStore.fetchMyApprovalsSafe()
  }
  await refreshNotifications()
  notificationsTimer = setInterval(() => {
    void refreshNotifications()
  }, 45_000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  if (notificationsTimer) clearInterval(notificationsTimer)
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

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.menu-btn {
  display: none;
  background: #1f2937;
  border: 1px solid #374151;
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}
.menu-btn:hover { background: #374151; }

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.notifications {
  position: relative;
}

.notif-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #374151;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  color: #fff;
  position: relative;
  cursor: pointer;
}

.notif-btn:hover {
  background: #374151;
}

.notif-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.notif-dropdown {
  position: absolute;
  top: 44px;
  right: 0;
  width: 320px;
  max-height: 380px;
  overflow-y: auto;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  z-index: 30;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #1f2937;
  color: #e5e7eb;
}

.notif-item {
  width: 100%;
  border: 0;
  background: transparent;
  color: #e5e7eb;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #1f2937;
  cursor: pointer;
}

.notif-item:hover {
  background: #1f2937;
}

.notif-title {
  font-size: 13px;
  font-weight: 600;
}

.notif-meta {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  justify-content: space-between;
}

.notif-empty {
  margin: 0;
  padding: 14px 12px;
  color: #9ca3af;
  font-size: 13px;
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

.user-info small,
.user-meta {
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

@media (max-width: 900px) {
  .menu-btn { display: flex; }
  .topbar { padding: 14px 18px; gap: 12px; }
  .page-title { font-size: 20px; }
  .search-box { display: none; }
  .user-profile { padding: 6px 10px; gap: 8px; }
  .user-avatar { width: 36px; height: 36px; font-size: 14px; }
}

@media (max-width: 560px) {
  .topbar { padding: 12px 14px; }
  .page-title { font-size: 18px; }
  .user-info { display: none; }
  .notif-dropdown {
    right: -40px;
    width: min(92vw, 320px);
  }
}
</style>
