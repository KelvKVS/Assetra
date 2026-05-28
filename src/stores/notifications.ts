import { defineStore } from 'pinia'
import api from '../services/api'

export type NotificationItem = {
  id: string
  kind: 'approval' | 'request' | 'maintenance' | 'movement' | 'asset' | 'task'
  title: string
  message: string
  sender: string
  createdAt: string
  route: string
}

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [] as NotificationItem[],
    loading: false,
    lastFetchedAt: 0,
  }),
  actions: {
    async fetchNotifications() {
      this.loading = true
      try {
        const { data } = await api.get<NotificationItem[]>('/notifications')
        this.items = Array.isArray(data) ? data : []
        this.lastFetchedAt = Date.now()
      } catch {
        this.items = []
      } finally {
        this.loading = false
      }
    },
    clear() {
      this.items = []
      this.lastFetchedAt = 0
    },
  },
})
