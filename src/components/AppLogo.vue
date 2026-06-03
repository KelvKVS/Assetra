<template>
  <span class="app-logo-frame" :class="`app-logo-frame--${size}`">
    <img
      :src="APP_LOGO_SRC"
      :alt="alt"
      class="app-logo-img"
      decoding="async"
    />
  </span>
</template>

<script setup lang="ts">
import { APP_LOGO_SRC, APP_NAME } from '../constants/branding'

withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg' | 'xl'
    alt?: string
  }>(),
  {
    size: 'sm',
    alt: APP_NAME,
  },
)
</script>

<style scoped>
.app-logo-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
  border: 1px solid var(--primary, #3b82f6);
  border-radius: 8px;
  padding: 2px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--primary-light, rgba(59, 130, 246, 0.15));
}

.app-logo-img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.app-logo-frame--sm .app-logo-img {
  max-height: 28px;
}

.app-logo-frame--md .app-logo-img {
  max-height: 38px;
}

.app-logo-frame--lg .app-logo-img {
  max-height: 52px;
}

.app-logo-frame--xl .app-logo-img {
  max-height: 88px;
  max-width: min(200px, 50vw);
}
</style>
