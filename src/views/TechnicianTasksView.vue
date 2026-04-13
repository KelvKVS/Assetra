<template>
  <section class="card">
    <h2>Execução Técnica</h2>
    <p class="muted">Fila operacional para o técnico atualizar o andamento das ordens.</p>

    <div class="stats-grid">
      <article class="stat-box stat-primary">
        <span>Ordens ativas</span>
        <strong>{{ activeCount }}</strong>
      </article>
      <article class="stat-box">
        <span>Concluídas hoje</span>
        <strong>{{ completedCount }}</strong>
      </article>
      <article class="stat-box">
        <span>Alta prioridade</span>
        <strong>{{ highPriorityCount }}</strong>
      </article>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Ativo</th>
          <th>Tarefa</th>
          <th>Prioridade</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in tasks" :key="item.id">
          <td>{{ item.assetTag }}</td>
          <td>{{ item.task }}</td>
          <td>{{ item.priority }}</td>
          <td>{{ item.status }}</td>
          <td class="actions-cell">
            <button class="mini-btn" :disabled="item.status === 'Concluída'" @click="advanceStatus(item.id)">
              Avançar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type TaskStatus = 'Aberta' | 'Em andamento' | 'Concluída'
type TaskPriority = 'Alta' | 'Média' | 'Baixa'

type TaskItem = {
  id: number
  assetTag: string
  task: string
  priority: TaskPriority
  status: TaskStatus
}

const tasks = ref<TaskItem[]>([
  { id: 1, assetTag: 'AST-003', task: 'Diagnóstico de falha de vídeo', priority: 'Alta', status: 'Aberta' },
  { id: 2, assetTag: 'AST-007', task: 'Limpeza e testes preventivos', priority: 'Média', status: 'Em andamento' },
  { id: 3, assetTag: 'AST-011', task: 'Troca de teclado', priority: 'Baixa', status: 'Concluída' },
])

const activeCount = computed(() => tasks.value.filter((item) => item.status !== 'Concluída').length)
const completedCount = computed(() => tasks.value.filter((item) => item.status === 'Concluída').length)
const highPriorityCount = computed(() => tasks.value.filter((item) => item.priority === 'Alta').length)

const advanceStatus = (id: number) => {
  tasks.value = tasks.value.map((item) => {
    if (item.id !== id) return item
    if (item.status === 'Aberta') return { ...item, status: 'Em andamento' }
    if (item.status === 'Em andamento') return { ...item, status: 'Concluída' }
    return item
  })
}
</script>
