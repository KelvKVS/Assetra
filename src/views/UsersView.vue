<template>
  <section class="card">
    <h2>Usuários e Perfis</h2>
    <p class="muted">Gestão de acesso por perfil (Administrador, Técnico e Gestor).</p>

    <form class="inline-form" @submit.prevent="addUser">
      <input v-model.trim="newUser.name" type="text" placeholder="Nome completo" required />
      <input v-model.trim="newUser.email" type="email" placeholder="E-mail" required />
      <select v-model="newUser.profile" required>
        <option>Administrador</option>
        <option>Gestor</option>
        <option>Técnico</option>
      </select>
      <select v-model="newUser.status" required>
        <option>Ativo</option>
        <option>Inativo</option>
      </select>
      <button type="submit">Cadastrar usuário</button>
    </form>
    <p v-if="formError" class="error">{{ formError }}</p>

    <div class="table-toolbar">
      <input v-model.trim="search" type="text" placeholder="Buscar por nome, e-mail ou perfil" />
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Perfil</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in filteredUsers" :key="user.email">
          <template v-if="editingEmail === user.email">
            <td><input v-model.trim="editUser.name" type="text" /></td>
            <td><input v-model.trim="editUser.email" type="email" /></td>
            <td>
              <select v-model="editUser.profile">
                <option>Administrador</option>
                <option>Gestor</option>
                <option>Técnico</option>
              </select>
            </td>
            <td>
              <select v-model="editUser.status">
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </td>
            <td class="actions-cell">
              <button class="mini-btn" @click="saveUserEdit(user.email)">Salvar</button>
              <button class="mini-btn warning" @click="cancelUserEdit">Cancelar</button>
            </td>
          </template>
          <template v-else>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.profile }}</td>
            <td>{{ user.status }}</td>
            <td class="actions-cell">
              <button class="mini-btn" @click="startUserEdit(user)">Editar</button>
              <button class="danger mini-btn" @click="removeUser(user.email)">Excluir</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { type User, useMockDataStore } from '../stores/mockData'

const mockStore = useMockDataStore()
mockStore.hydrate()
const formError = ref('')
const editingEmail = ref<string | null>(null)

const newUser = reactive<User>({
  name: '',
  email: '',
  profile: 'Técnico',
  status: 'Ativo',
})
const editUser = reactive<User>({
  name: '',
  email: '',
  profile: 'Técnico',
  status: 'Ativo',
})

const search = ref('')

const filteredUsers = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return mockStore.users
  return mockStore.users.filter((user) =>
    [user.name, user.email, user.profile, user.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const addUser = () => {
  formError.value = ''
  const added = mockStore.addUser({ ...newUser })
  if (!added) {
    formError.value = 'Já existe um usuário com este e-mail.'
    return
  }
  newUser.name = ''
  newUser.email = ''
  newUser.profile = 'Técnico'
  newUser.status = 'Ativo'
}

const removeUser = (email: string) => {
  mockStore.removeUser(email)
}

const startUserEdit = (user: User) => {
  formError.value = ''
  editingEmail.value = user.email
  editUser.name = user.name
  editUser.email = user.email
  editUser.profile = user.profile
  editUser.status = user.status
}

const cancelUserEdit = () => {
  editingEmail.value = null
}

const saveUserEdit = (originalEmail: string) => {
  formError.value = ''
  const updated = mockStore.updateUser(originalEmail, { ...editUser })
  if (!updated) {
    formError.value = 'Não foi possível salvar: o novo e-mail já existe.'
    return
  }
  editingEmail.value = null
}
</script>
