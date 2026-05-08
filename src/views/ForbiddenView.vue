<template>
  <section class="forbidden-page">
    <div class="forbidden-card">
      <p class="eyebrow">Permissões</p>
      <h2>Acesso negado</h2>
      <p class="muted">
        Você não possui permissão para acessar esta área.
      </p>
      <p v-if="fromPath" class="path-hint">Rota solicitada: <code>{{ fromPath }}</code></p>
      <div class="actions">
        <button class="btn-primary" @click="goDashboard">Voltar ao dashboard</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const fromPath = computed(() => String(route.query.from ?? '').trim())

const goDashboard = () => {
  void router.push({ name: 'dashboard' })
}
</script>

<style scoped>
.forbidden-page {
  min-height: calc(100vh - 180px);
  display: grid;
  place-items: center;
}

.forbidden-card {
  width: min(560px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 28px;
  box-shadow: var(--shadow-lg);
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--warning);
  font-weight: 700;
}

h2 {
  margin: 0 0 8px;
}

.muted {
  margin: 0;
  color: var(--text-secondary);
}

.path-hint {
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.actions {
  margin-top: 20px;
}

.btn-primary {
  border: 0;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  padding: 10px 16px;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--primary-hover);
}
</style>
