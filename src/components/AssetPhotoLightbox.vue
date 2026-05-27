<template>
  <Teleport to="body">
    <div
      v-if="open && slides.length"
      class="photo-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="title ? `Fotos de ${title}` : 'Galeria de fotos'"
      @click.self="emit('close')"
    >
      <div class="lightbox-panel" @click.stop>
        <header class="lightbox-header">
          <div class="lightbox-meta">
            <strong v-if="title">{{ title }}</strong>
            <span class="lightbox-counter">{{ current + 1 }} / {{ slides.length }}</span>
          </div>
          <button type="button" class="lightbox-close" aria-label="Fechar" @click="emit('close')">
            <X :size="22" :stroke-width="2.5" />
          </button>
        </header>

        <div class="lightbox-stage">
          <button
            v-if="slides.length > 1"
            type="button"
            class="lightbox-nav lightbox-prev"
            aria-label="Foto anterior"
            @click="prev"
          >
            <ChevronLeft :size="28" :stroke-width="2.5" />
          </button>

          <figure class="lightbox-figure">
            <img
              :key="active?.url"
              :src="active?.url"
              :alt="active?.originalName ?? active?.filename ?? 'Foto do ativo'"
            />
            <figcaption v-if="active?.originalName">{{ active.originalName }}</figcaption>
          </figure>

          <button
            v-if="slides.length > 1"
            type="button"
            class="lightbox-nav lightbox-next"
            aria-label="Próxima foto"
            @click="next"
          >
            <ChevronRight :size="28" :stroke-width="2.5" />
          </button>
        </div>

        <div v-if="slides.length > 1" class="lightbox-thumbs" role="tablist">
          <button
            v-for="(slide, idx) in slides"
            :key="`${slide.filename}-${idx}`"
            type="button"
            role="tab"
            :aria-selected="idx === current"
            :class="['thumb-btn', { active: idx === current }]"
            @click="goTo(idx)"
          >
            <img :src="slide.url" :alt="slide.originalName ?? `Foto ${idx + 1}`" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import type { AttachmentRef } from '../types/assetra'

const props = withDefaults(
  defineProps<{
    open: boolean
    attachments: AttachmentRef[]
    startIndex?: number
    title?: string
  }>(),
  { startIndex: 0, title: '' },
)

const emit = defineEmits<{ close: [] }>()

const isImageMime = (mime?: string) => !mime || mime.startsWith('image/')

const slides = computed(() => props.attachments.filter((a) => isImageMime(a.mimetype)))

const current = ref(0)

const clampIndex = (index: number) => {
  if (!slides.value.length) return 0
  return Math.min(Math.max(0, index), slides.value.length - 1)
}

watch(
  () => [props.open, props.startIndex, slides.value.length] as const,
  ([open]) => {
    if (open) current.value = clampIndex(props.startIndex)
  },
)

const active = computed(() => slides.value[current.value])

const prev = () => {
  if (slides.value.length < 2) return
  current.value = (current.value - 1 + slides.value.length) % slides.value.length
}

const next = () => {
  if (slides.value.length < 2) return
  current.value = (current.value + 1) % slides.value.length
}

const goTo = (index: number) => {
  current.value = clampIndex(index)
}

const onKeydown = (e: KeyboardEvent) => {
  if (!props.open || !slides.value.length) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

const setOpen = (open: boolean) => {
  if (open) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
}

watch(() => props.open, setOpen)

onUnmounted(() => setOpen(false))
</script>

<style scoped>
.photo-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
  animation: lightbox-fade 0.2s ease;
}

.lightbox-panel {
  width: min(920px, 100%);
  max-height: min(92vh, 900px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
}

.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}

.lightbox-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.lightbox-meta strong {
  font-size: 15px;
  color: var(--text-primary);
}

.lightbox-counter {
  font-size: 12px;
  color: var(--text-muted);
}

.lightbox-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.lightbox-close:hover {
  background: var(--danger-light);
  color: var(--danger);
}

.lightbox-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 8px 52px 16px;
}

.lightbox-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}

.lightbox-figure img {
  max-width: 100%;
  max-height: min(58vh, 620px);
  object-fit: contain;
  border-radius: 10px;
  background: var(--bg-primary);
}

.lightbox-figure figcaption {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-light);
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.lightbox-nav:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.lightbox-prev {
  left: 12px;
}

.lightbox-next {
  right: 12px;
}

.lightbox-thumbs {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  overflow-x: auto;
}

.thumb-btn {
  flex: 0 0 auto;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.15s ease, border-color 0.15s ease;
}

.thumb-btn img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.thumb-btn:hover {
  opacity: 1;
}

.thumb-btn.active {
  opacity: 1;
  border-color: var(--primary);
}

@keyframes lightbox-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .photo-lightbox {
    padding: 0;
  }

  .lightbox-panel {
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
    border: none;
  }

  .lightbox-stage {
    padding: 8px 44px 12px;
    min-height: 220px;
  }

  .lightbox-nav {
    width: 34px;
    height: 34px;
  }
}
</style>
