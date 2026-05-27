<template>
  <div class="password-field" :class="wrapperClass">
    <input
      ref="inputRef"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :minlength="minlength"
      :name="name"
      :id="id"
      :class="inputClass"
      @input="onInput"
    />
    <button
      type="button"
      class="password-field-toggle"
      :aria-label="visible ? 'Ocultar senha' : 'Mostrar senha'"
      :aria-pressed="visible"
      :disabled="disabled"
      @click="visible = !visible"
    >
      <Eye v-if="!visible" :size="18" :stroke-width="2" />
      <EyeOff v-else :size="18" :stroke-width="2" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    autocomplete?: string
    required?: boolean
    disabled?: boolean
    minlength?: number
    name?: string
    id?: string
    inputClass?: string
    wrapperClass?: string
  }>(),
  {
    placeholder: '',
    autocomplete: 'current-password',
    required: false,
    disabled: false,
    inputClass: '',
    wrapperClass: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const visible = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const onInput = (ev: Event) => {
  emit('update:modelValue', (ev.target as HTMLInputElement).value)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
})
</script>

<style scoped>
.password-field {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
}

.password-field input {
  width: 100%;
  padding-right: 42px;
}

.password-field-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.password-field-toggle:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.password-field-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
