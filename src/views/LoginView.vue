<template>
  <section class="card">
    <h2>Entrar</h2>
    <p class="muted">Use o usuário de teste para começar o desenvolvimento.</p>

    <form class="form" @submit.prevent="handleLogin">
      <label>
        Perfil de acesso
        <select v-model="profile">
          <option value="Administrador">Administrador</option>
          <option value="Gestor">Gestor</option>
          <option value="Técnico">Técnico</option>
        </select>
      </label>

      <label>
        E-mail
        <input v-model.trim="email" type="email" autocomplete="username" required />
      </label>

      <label>
        Senha
        <input v-model="password" type="password" autocomplete="current-password" required minlength="8" />
      </label>

      <button type="submit" :disabled="authStore.isLoading">
        {{ authStore.isLoading ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>

    <p v-if="authStore.error" class="error">{{ authStore.error }}</p>
    <p class="hint"><strong>Admin:</strong> admin@assetra.local / Admin@12345</p>
    <p class="hint"><strong>Mock:</strong> gestor e técnico entram direto pelo frontend.</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMockDataStore, type Profile } from '../stores/mockData'

const router = useRouter()
const authStore = useAuthStore()
const mockStore = useMockDataStore()
mockStore.hydrate()

const profile = ref<Profile>('Administrador')
const email = ref('admin@assetra.local')
const password = ref('Admin@12345')

const handleLogin = async () => {
  try {
    if (profile.value !== 'Administrador') {
      const matchedUser = mockStore.users.find((user) => user.profile === profile.value && user.status === 'Ativo')
      if (!matchedUser) {
        authStore.error = `Nao existe usuario ativo para o perfil ${profile.value}.`
        return
      }

      authStore.mockLogin({
        id: `mock-${profile.value.toLowerCase()}`,
        name: matchedUser.name,
        email: matchedUser.email,
        profile: matchedUser.profile,
      })
      await router.push('/dashboard')
      return
    }

    await authStore.login(email.value, password.value)
    await router.push('/dashboard')
  } catch {
    // Mensagem de erro já tratada no store.
  }
}
</script>
