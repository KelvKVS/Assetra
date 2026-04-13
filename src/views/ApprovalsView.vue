<template>
  <section class="card">
    <h2>Aprovações do Gestor</h2>
    <p class="muted">Solicitações pendentes de aprovação para movimentações e manutenções.</p>

    <div class="stats-grid">
      <article class="stat-box stat-primary">
        <span>Total pendente</span>
        <strong>{{ pending.length }}</strong>
      </article>
      <article class="stat-box">
        <span>Aprovadas</span>
        <strong>{{ approvedCount }}</strong>
      </article>
      <article class="stat-box">
        <span>Reprovadas</span>
        <strong>{{ rejectedCount }}</strong>
      </article>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Ativo</th>
          <th>Descrição</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in approvals" :key="item.id">
          <td>{{ item.type }}</td>
          <td>{{ item.assetTag }}</td>
          <td>{{ item.description }}</td>
          <td>{{ item.status }}</td>
          <td class="actions-cell">
            <button class="mini-btn" :disabled="item.status !== 'Pendente'" @click="setStatus(item.id, 'Aprovada')">Aprovar</button>
            <button class="mini-btn danger" :disabled="item.status !== 'Pendente'" @click="setStatus(item.id, 'Reprovada')">Reprovar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type ApprovalStatus = 'Pendente' | 'Aprovada' | 'Reprovada'
type ApprovalItem = {
  id: number
  type: 'Movimentação' | 'Manutenção'
  assetTag: string
  description: string
  status: ApprovalStatus
}

const approvals = ref<ApprovalItem[]>([
  { id: 1, type: 'Movimentação', assetTag: 'AST-001', description: 'Transferência para Financeiro', status: 'Pendente' },
  { id: 2, type: 'Manutenção', assetTag: 'AST-003', description: 'Troca de placa de vídeo', status: 'Pendente' },
  { id: 3, type: 'Movimentação', assetTag: 'AST-010', description: 'Retorno para Estoque', status: 'Aprovada' },
])

const pending = computed(() => approvals.value.filter((item) => item.status === 'Pendente'))
const approvedCount = computed(() => approvals.value.filter((item) => item.status === 'Aprovada').length)
const rejectedCount = computed(() => approvals.value.filter((item) => item.status === 'Reprovada').length)

const setStatus = (id: number, status: ApprovalStatus) => {
  approvals.value = approvals.value.map((item) => (item.id === id ? { ...item, status } : item))
}
</script>
