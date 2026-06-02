import { ref } from 'vue'

const profileOpen = ref(false)
const focusPasswordSection = ref(false)

export function useProfilePanel() {
  function openProfile(options?: { focusPassword?: boolean }) {
    focusPasswordSection.value = options?.focusPassword ?? false
    profileOpen.value = true
  }

  function closeProfile() {
    profileOpen.value = false
    focusPasswordSection.value = false
  }

  return {
    profileOpen,
    focusPasswordSection,
    openProfile,
    closeProfile,
  }
}
