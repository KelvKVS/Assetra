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

      <button

        type="button"

        class="search-toggle"

        :aria-expanded="searchOpen"

        aria-label="Abrir busca"

        @click="toggleSearch"

      >

        <Search :size="18" :stroke-width="2.5" />

      </button>



      <div class="search-wrap" :class="{ open: searchOpen }">

        <div class="search-box">

          <Search class="search-icon" :size="16" />

          <input

            ref="searchInputRef"

            v-model="searchQuery"

            type="text"

            placeholder="Busca rápida: ativos, pessoas, manutenções..."

            class="search-input"

            autocomplete="off"

            enterkeyhint="search"

            role="combobox"

            :aria-expanded="showSearchPanel"

            aria-controls="global-search-results"

            @focus="onSearchFocus"

            @input="onSearchInput"

            @keydown.escape="closeSearch"

          />

          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            aria-label="Limpar busca"
            @click="clearSearch"
          >
            <X :size="14" />
          </button>

        </div>

        <div

          v-if="showSearchPanel"

          id="global-search-results"

          class="global-search-panel"

          role="listbox"

        >

          <p v-if="searchLoading" class="global-search-status">A carregar dados...</p>

          <p v-else-if="!groupedResults.length" class="global-search-status">Nenhum resultado para «{{ searchQuery.trim() }}»</p>

          <template v-else>

            <section v-for="group in groupedResults" :key="group.kind" class="global-search-group">

              <h4 class="global-search-group-title">{{ group.label }}</h4>

              <button

                v-for="item in group.items"

                :key="item.id"

                type="button"

                class="global-search-item"

                role="option"

                @mousedown.prevent="selectSearchResult(item)"

              >

                <component :is="kindIcon(group.kind)" :size="16" :stroke-width="2" class="global-search-item-icon" />

                <span class="global-search-item-text">

                  <span class="global-search-item-title">{{ item.title }}</span>

                  <span class="global-search-item-sub">{{ item.subtitle }}</span>

                </span>

              </button>

            </section>

          </template>

        </div>

      </div>



      <div v-if="authStore.user" class="user-profile-wrap">

        <div class="notifications" ref="notificationsRef">

          <button

            class="notif-btn"

            type="button"

            :aria-expanded="notificationsOpen"

            @click="toggleNotifications"

            aria-label="Abrir notificações"

          >

            <Bell :size="18" />

            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>

          </button>

          <button

            v-if="notificationsOpen"

            type="button"

            class="notif-backdrop"

            aria-label="Fechar notificações"

            @click="closeNotifications"

          />

          <div v-if="notificationsOpen" class="notif-dropdown" role="dialog" aria-label="Notificações">

            <div class="notif-header">

              <strong>Notificações</strong>

              <small v-if="unreadCount > 0">{{ unreadCount }} novas</small>

              <small v-else>Tudo em dia</small>

              <button

                v-if="notifications.length"

                type="button"

                class="notif-mark-read"

                @click="markAllAsRead"

              >

                Marcar lidas

              </button>

            </div>

            <p v-if="notificationsStore.loading" class="notif-empty">A carregar...</p>

            <button

              v-for="notification in notifications"

              :key="notification.id"

              class="notif-item"

              :class="{ unread: isUnread(notification) }"

              type="button"

              @click="openNotification(notification)"

            >

              <div class="notif-title">{{ notification.title }}</div>

              <p v-if="notification.message" class="notif-message">{{ notification.message }}</p>

              <div class="notif-meta">

                <span>De: {{ notification.sender }}</span>

                <span>{{ notification.timeLabel }}</span>

              </div>

            </button>

            <p v-if="!notificationsStore.loading && notifications.length === 0" class="notif-empty">

              Sem novidades no momento.

            </p>

          </div>

        </div>

        <button
          type="button"
          class="user-profile"
          aria-haspopup="dialog"
          :aria-expanded="profileOpen"
          title="Ver perfil"
          @click="profileOpen = true"
        >
          <div class="user-avatar">
            <img v-if="avatarDisplayUrl" :src="avatarDisplayUrl" :alt="`Foto de ${authStore.user.name}`" />
            <span v-else>{{ userInitial }}</span>
          </div>

          <div class="user-info">
            <strong>{{ authStore.user.name }}</strong>
            <small class="user-meta">
              {{ roleLabel }}<template v-if="authStore.user.department"> · {{ authStore.user.department }}</template><template v-if="authStore.user.tenant"> · {{ authStore.user.tenant.name }}</template>
            </small>
          </div>
        </button>

        <button class="logout-btn" type="button" @click.stop="handleLogout" title="Sair">
          <LogOut :size="18" />
        </button>

        <ProfilePanel v-model:open="profileOpen" />
      </div>

    </div>

  </header>

</template>



<script setup lang="ts">

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { useRouter } from 'vue-router'

import { useAuthStore } from '../stores/auth'

import { useNotificationsStore, type NotificationItem } from '../stores/notifications'

import { roleLabelPt } from '../utils/roleLabels'

import { useSidebar } from '../composables/useSidebar'

import { useGlobalSearch, type GlobalSearchItem, type GlobalSearchKind } from '../composables/useGlobalSearch'

import ProfilePanel from './ProfilePanel.vue'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { Search, LogOut, Menu, Bell, X, User, Monitor, Wrench, ArrowLeftRight, ClipboardCheck, FileText } from 'lucide-vue-next'



const sidebar = useSidebar()

const {
  searchQuery,
  groupedResults,
  hasQuery,
  ensureData,
  openResult,
  clear: clearGlobalSearch,
} = useGlobalSearch()

const searchLoading = ref(false)
const showSearchPanel = computed(() => searchOpen.value && hasQuery.value)



defineProps<{

  title: string

}>()



const authStore = useAuthStore()

const notificationsStore = useNotificationsStore()

const router = useRouter()

const notificationsOpen = ref(false)
const profileOpen = ref(false)

const searchOpen = ref(false)

const searchInputRef = ref<HTMLInputElement | null>(null)

const notificationsRef = ref<HTMLElement | null>(null)

let notificationsTimer: ReturnType<typeof setInterval> | null = null

const readNotificationIds = ref<string[]>([])

const lastSeenAt = ref(0)



type UiNotification = NotificationItem & {

  timeLabel: string

  timestamp: number

}



const userInitial = computed(() => authStore.user?.name?.charAt(0).toUpperCase() ?? 'U')
const avatarDisplayUrl = computed(() => resolveMediaUrl(authStore.user?.avatarUrl ?? '') || '')



const roleLabel = computed(() => roleLabelPt(authStore.user?.role))

const notifications = computed<UiNotification[]>(() =>

  notificationsStore.items

    .map((item) => ({

      ...item,

      timeLabel: formatDateTime(item.createdAt),

      timestamp: parseDate(item.createdAt),

    }))

    .sort((a, b) => b.timestamp - a.timestamp),

)



function isUnread(notification: UiNotification) {

  if (readNotificationIds.value.includes(notification.id)) return false

  return notification.timestamp > lastSeenAt.value

}



const unreadCount = computed(() => notifications.value.filter((n) => isUnread(n)).length)



const readStorageKey = computed(() => `assetra-read-notifications:${authStore.user?.id ?? 'guest'}`)

const seenStorageKey = computed(() => `assetra-notifications-seen:${authStore.user?.id ?? 'guest'}`)



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



function kindIcon(kind: GlobalSearchKind) {
  const map = {
    user: User,
    asset: Monitor,
    maintenance: Wrench,
    movement: ArrowLeftRight,
    approval: ClipboardCheck,
    request: FileText,
  }
  return map[kind]
}

async function loadSearchData() {
  searchLoading.value = true
  try {
    await ensureData()
  } finally {
    searchLoading.value = false
  }
}

async function onSearchFocus() {
  searchOpen.value = true
  await loadSearchData()
}

async function onSearchInput() {
  searchOpen.value = true
  if (hasQuery.value) await loadSearchData()
}

function clearSearch() {
  clearGlobalSearch()
}

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInputRef.value?.focus()
    await loadSearchData()
  }
}

function selectSearchResult(item: GlobalSearchItem) {
  openResult(item)
  closeSearch()
}

function closeSearch() {
  searchOpen.value = false
  clearGlobalSearch()
}



function closeNotifications() {

  notificationsOpen.value = false

}

function toggleNotifications() {

  notificationsOpen.value = !notificationsOpen.value

  if (notificationsOpen.value) {

    void refreshNotifications()

  }

}



function openNotification(notification: UiNotification) {

  markNotificationRead(notification.id)

  notificationsOpen.value = false

  router.push(notification.route)

}



function markNotificationRead(id: string) {

  if (!readNotificationIds.value.includes(id)) {

    readNotificationIds.value = [...readNotificationIds.value, id]

    persistReadState()

  }

}



function onClickOutside(event: MouseEvent) {

  const target = event.target as Node | null

  if (!target) return

  const inNotifications = (target as Element).closest?.('.notifications, .notif-backdrop')

  if (!inNotifications && notificationsOpen.value) {

    closeNotifications()

  }

  const inSearch = (target as Element).closest?.('.search-wrap, .search-toggle')

  if (!inSearch && searchOpen.value) {
    closeSearch()
  }

}



function persistReadState() {

  try {

    localStorage.setItem(readStorageKey.value, JSON.stringify(readNotificationIds.value))

    localStorage.setItem(seenStorageKey.value, String(lastSeenAt.value))

  } catch {

    /* ignore */

  }

}



function loadReadState() {

  try {

    const raw = localStorage.getItem(readStorageKey.value)

    if (!raw) {

      readNotificationIds.value = []

    } else {

      const parsed = JSON.parse(raw)

      readNotificationIds.value = Array.isArray(parsed) ? parsed : []

    }

    const seenRaw = localStorage.getItem(seenStorageKey.value)

    lastSeenAt.value = seenRaw ? Number(seenRaw) || 0 : 0

  } catch {

    readNotificationIds.value = []

    lastSeenAt.value = 0

  }

}



function markAllAsRead() {

  const allIds = notifications.value.map((n) => n.id)

  readNotificationIds.value = Array.from(new Set([...readNotificationIds.value, ...allIds]))

  lastSeenAt.value = Date.now()

  persistReadState()

}



async function refreshNotifications() {

  await notificationsStore.fetchNotifications()

}



onMounted(async () => {

  document.addEventListener('click', onClickOutside)

  if (!authStore.isAuthenticated) return

  loadReadState()

  await refreshNotifications()

  notificationsTimer = setInterval(() => {

    void refreshNotifications()

  }, 30_000)

})



onBeforeUnmount(() => {

  document.removeEventListener('click', onClickOutside)

  if (notificationsTimer) clearInterval(notificationsTimer)

})



const handleLogout = async () => {

  notificationsStore.clear()

  await authStore.logout()

  router.push('/login')

}

</script>



<style scoped>

.topbar {

  --assetra-topbar-h: clamp(52px, 13vw, 64px);

  background: #111827;

  border-bottom: 1px solid #1f2937;

  padding: clamp(10px, 2vw, 16px) clamp(12px, 2.5vw, 24px);

  display: flex;

  flex-wrap: nowrap;

  justify-content: space-between;

  align-items: center;

  gap: 10px;

  position: sticky;

  top: 0;

  z-index: 50;

  min-width: 0;

}



.topbar-left {

  display: flex;

  align-items: center;

  gap: 10px;

  min-width: 0;

  flex: 1 1 auto;

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

  font-size: clamp(1rem, 2.5vw, 1.5rem);

  font-weight: 700;

  color: #fff;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.topbar-right {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-shrink: 0;

  min-width: 0;

}



.search-toggle {

  display: none;

  align-items: center;

  justify-content: center;

  width: 40px;

  height: 40px;

  border-radius: 8px;

  border: 1px solid #374151;

  background: #1f2937;

  color: #e5e7eb;

  cursor: pointer;

  flex-shrink: 0;

}



.search-toggle:hover {

  background: #374151;

}



.search-wrap {

  position: relative;

  display: flex;

  align-items: flex-start;

}



.search-box {

  position: relative;

  display: flex;

  align-items: center;

}



.global-search-panel {

  position: absolute;

  top: calc(100% + 8px);

  right: 0;

  width: min(420px, 92vw);

  max-height: min(70vh, 480px);

  overflow-y: auto;

  background: #1f2937;

  border: 1px solid #374151;

  border-radius: 12px;

  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);

  z-index: 70;

  padding: 6px 0;

}



.global-search-status {

  padding: 12px 14px;

  color: #9ca3af;

  font-size: 13px;

  margin: 0;

}



.global-search-group-title {

  font-size: 11px;

  text-transform: uppercase;

  letter-spacing: 0.06em;

  color: #6b7280;

  margin: 8px 12px 4px;

  font-weight: 600;

}



.global-search-item {

  display: flex;

  align-items: flex-start;

  gap: 10px;

  width: 100%;

  text-align: left;

  padding: 10px 12px;

  border: none;

  border-radius: 8px;

  background: transparent;

  color: #fff;

  cursor: pointer;

}



.global-search-item:hover {

  background: #374151;

}



.global-search-item-text {

  min-width: 0;

}



.global-search-item-title {

  display: block;

  font-size: 14px;

  font-weight: 600;

  line-height: 1.3;

}



.global-search-item-sub {

  display: block;

  font-size: 12px;

  color: #9ca3af;

  margin-top: 2px;

  line-height: 1.35;

}



.global-search-item-icon {

  flex-shrink: 0;

  color: #60a5fa;

  margin-top: 2px;

}



.search-input {

  background: #1f2937;

  border: 1px solid #374151;

  border-radius: 8px;

  padding: 9px 36px 9px 36px;

  font-size: 14px;

  color: #fff;

  width: min(280px, 36vw);

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

  pointer-events: none;

}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.search-clear:hover {
  background: #374151;
  color: #e5e7eb;
}

.user-profile-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #1f2937;
  border-radius: 12px;
  border: 1px solid #374151;
  min-width: 0;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.user-profile:hover {
  border-color: #3b82f6;
  background: #243044;
}



.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}



.notifications {

  position: relative;

  flex-shrink: 0;

}



.notif-backdrop {

  display: none;

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

  top: calc(100% + 8px);

  right: 0;

  width: min(320px, calc(100vw - 24px));

  max-height: min(380px, calc(100dvh - 96px));

  overflow-y: auto;

  overscroll-behavior: contain;

  -webkit-overflow-scrolling: touch;

  background: #111827;

  border: 1px solid #374151;

  border-radius: 12px;

  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);

  z-index: 120;

}



.notif-header {

  display: flex;

  flex-wrap: wrap;

  justify-content: space-between;

  align-items: center;

  gap: 6px 10px;

  padding: 10px 12px;

  border-bottom: 1px solid #1f2937;

  color: #e5e7eb;

}



.notif-mark-read {

  margin-left: auto;

  border: none;

  background: transparent;

  color: #60a5fa;

  font-size: 12px;

  font-weight: 600;

  cursor: pointer;

  padding: 0;

}



.notif-mark-read:hover {

  text-decoration: underline;

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



.notif-item.unread {

  background: rgba(59, 130, 246, 0.12);

  border-left: 3px solid #3b82f6;

}



.notif-title {

  font-size: 13px;

  font-weight: 600;

}



.notif-message {

  margin: 4px 0 0;

  font-size: 12px;

  color: #d1d5db;

  line-height: 1.4;

}



.notif-meta {

  margin-top: 4px;

  font-size: 11px;

  color: #9ca3af;

  display: flex;

  justify-content: space-between;

  gap: 8px;

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

  min-width: 0;

  overflow: hidden;

}



.user-info strong {

  font-size: 13px;

  color: #fff;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.user-info small,

.user-meta {

  font-size: 11px;

  color: #9ca3af;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  max-width: 100%;

}



.logout-btn {

  display: flex;

  align-items: center;

  justify-content: center;

  background: transparent;

  border: 1px solid #374151;

  border-radius: 6px;

  width: 36px;

  height: 36px;

  padding: 0;

  cursor: pointer;

  transition: all 0.2s ease;

  color: #fff;

  flex-shrink: 0;

}



.logout-btn:hover {

  background: #dc2626;

  border-color: #dc2626;

  color: #fff;

}



@media (max-width: 1024px) {

  .menu-btn { display: flex; }

  .search-toggle { display: flex; }

  .topbar,
  .topbar-right,
  .user-profile,
  .notifications {
    overflow: visible;
  }

  .topbar-right {

    position: relative;

  }

  .notif-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 199;
    border: none;
    padding: 0;
    margin: 0;
    background: rgba(15, 23, 42, 0.55);
    cursor: pointer;
  }

  .notif-dropdown {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + var(--assetra-topbar-h, 56px));
    right: 0;
    left: 0;
    bottom: auto;
    width: 100%;
    max-width: none;
    max-height: min(
      78dvh,
      calc(100dvh - var(--assetra-topbar-h, 56px) - env(safe-area-inset-top, 0px) - 12px)
    );
    z-index: 200;
    border-radius: 0 0 16px 16px;
    border-top: none;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
    animation: notif-slide-down 0.22s ease-out;
  }

  .search-wrap {

    position: absolute;

    top: calc(100% + 6px);

    right: 12px;

    left: 12px;

    display: none;

    z-index: 60;

    flex-direction: column;

  }

  .search-wrap.open {

    display: flex;

  }

  .search-wrap.open .search-input {

    width: 100%;

  }

  .global-search-panel {

    position: static;

    width: 100%;

    margin-top: 6px;

  }

  .topbar {

    position: sticky;

    flex-wrap: nowrap;

  }

  .topbar-right {

    margin-left: auto;

  }

}



@keyframes notif-slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {

  .user-info { display: none; }

  .user-profile { padding: 4px 6px; gap: 6px; }

  .topbar {
    --assetra-topbar-h: 52px;
  }

  .notif-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .notif-meta span:last-child {
    align-self: flex-end;
  }

}

</style>

