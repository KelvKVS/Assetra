<template>
  <Teleport to="body">
    <div v-if="toasts.length" class="toast-stack" aria-live="polite">
      <div
        v-for="item in toasts"
        :key="item.id"
        :class="['toast', `toast--${item.kind}`]"
        role="status"
      >
        <CheckCircle v-if="item.kind === 'success'" :size="20" :stroke-width="2.5" />
        <AlertCircle v-else-if="item.kind === 'error'" :size="20" :stroke-width="2.5" />
        <Info v-else :size="20" :stroke-width="2.5" />
        <span class="toast-text">{{ item.message }}</span>
        <button type="button" class="toast-close" aria-label="Fechar" @click="dismiss(item.id)">
          <X :size="16" :stroke-width="2.5" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-vue-next'
import { clearAllToasts, useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()

/** Limpa toasts presos após hot-reload em desenvolvimento. */
onMounted(() => {
  clearAllToasts()
})
</script>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.22);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  animation: toast-in 0.22s ease-out;
}

.toast--success {
  border-color: rgba(16, 185, 129, 0.45);
  background: color-mix(in srgb, #10b981 8%, var(--bg-card));
}
.toast--success > svg:first-of-type {
  color: #10b981;
  flex-shrink: 0;
}

.toast--error {
  border-color: rgba(239, 68, 68, 0.4);
  background: color-mix(in srgb, #ef4444 8%, var(--bg-card));
}
.toast--error > svg:first-of-type {
  color: #ef4444;
  flex-shrink: 0;
}

.toast--info > svg:first-of-type {
  color: var(--primary);
  flex-shrink: 0;
}

.toast-text {
  flex: 1;
  min-width: 0;
}

.toast-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
