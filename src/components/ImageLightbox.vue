<template>
  <Teleport to="body">
    <div
      v-if="open && slides.length"
      class="image-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="title ? `Imagens — ${title}` : 'Visualizador de imagens'"
      @click.self="emit('close')"
    >
      <div class="lightbox-panel" @click.stop>
        <header class="lightbox-header">
          <div class="lightbox-meta">
            <strong v-if="title">{{ title }}</strong>
            <span class="lightbox-counter">{{ current + 1 }} / {{ slides.length }}</span>
          </div>
          <div class="lightbox-tools">
            <button type="button" class="tool-btn" aria-label="Diminuir zoom" :disabled="zoom <= minZoom" @click="zoomOut">
              <ZoomOut :size="18" />
            </button>
            <span class="zoom-label">{{ zoomPercent }}%</span>
            <button type="button" class="tool-btn" aria-label="Aumentar zoom" :disabled="zoom >= maxZoom" @click="zoomIn">
              <ZoomIn :size="18" />
            </button>
            <button type="button" class="tool-btn" aria-label="Redefinir zoom" @click="resetZoom">
              <RotateCcw :size="18" />
            </button>
            <button type="button" class="lightbox-close" aria-label="Fechar" @click="emit('close')">
              <X :size="22" :stroke-width="2.5" />
            </button>
          </div>
        </header>

        <div class="lightbox-stage" @wheel.prevent="onWheel">
          <button
            v-if="slides.length > 1"
            type="button"
            class="lightbox-nav lightbox-prev"
            aria-label="Imagem anterior"
            @click="prev"
          >
            <ChevronLeft :size="28" :stroke-width="2.5" />
          </button>

          <div class="zoom-viewport">
            <figure class="lightbox-figure">
              <img
                :key="`${active?.url}-${zoom}`"
                :src="active?.url"
                :alt="active?.originalName ?? active?.filename ?? 'Imagem'"
                :style="{ transform: `scale(${zoom})` }"
                class="zoom-image"
                @dblclick="toggleZoom"
              />
              <figcaption v-if="active?.originalName">{{ active.originalName }}</figcaption>
            </figure>
          </div>

          <button
            v-if="slides.length > 1"
            type="button"
            class="lightbox-nav lightbox-next"
            aria-label="Próxima imagem"
            @click="next"
          >
            <ChevronRight :size="28" :stroke-width="2.5" />
          </button>
        </div>

        <p class="zoom-hint">Roda do rato ou botões +/- para zoom · duplo clique para alternar</p>

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
            <img :src="slide.url" :alt="slide.originalName ?? `Imagem ${idx + 1}`" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-vue-next'
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

const minZoom = 1
const maxZoom = 4
const zoomStep = 0.25

const isImageMime = (mime?: string) => !mime || mime.startsWith('image/')

const slides = computed(() => props.attachments.filter((a) => isImageMime(a.mimetype)))

const current = ref(0)
const zoom = ref(1)

const clampIndex = (index: number) => {
  if (!slides.value.length) return 0
  return Math.min(Math.max(0, index), slides.value.length - 1)
}

const resetZoom = () => {
  zoom.value = 1
}

watch(
  () => [props.open, props.startIndex, slides.value.length] as const,
  ([open]) => {
    if (open) {
      current.value = clampIndex(props.startIndex)
      resetZoom()
    }
  },
)

watch(current, () => resetZoom())

const active = computed(() => slides.value[current.value])
const zoomPercent = computed(() => Math.round(zoom.value * 100))

const zoomIn = () => {
  zoom.value = Math.min(maxZoom, Math.round((zoom.value + zoomStep) * 100) / 100)
}

const zoomOut = () => {
  zoom.value = Math.max(minZoom, Math.round((zoom.value - zoomStep) * 100) / 100)
}

const toggleZoom = () => {
  zoom.value = zoom.value > 1 ? 1 : 2
}

const onWheel = (e: WheelEvent) => {
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

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
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
  if (e.key === '0') resetZoom()
}

const setOpen = (open: boolean) => {
  if (open) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
    resetZoom()
  }
}

watch(() => props.open, setOpen)

onUnmounted(() => setOpen(false))
</script>

<style scoped>
.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(6px);
  animation: lightbox-fade 0.2s ease;
}

.lightbox-panel {
  width: min(960px, 100%);
  max-height: min(94vh, 920px);
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
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
  overflow-wrap: anywhere;
}

.lightbox-counter {
  font-size: 12px;
  color: var(--text-muted);
}

.lightbox-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.tool-btn,
.lightbox-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.tool-btn:hover:not(:disabled),
.lightbox-close:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-label {
  min-width: 44px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.lightbox-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 8px 52px 8px;
}

.zoom-viewport {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  max-height: min(58vh, 620px);
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-overflow-scrolling: touch;
}

.lightbox-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
}

.zoom-image {
  max-width: min(100%, 820px);
  max-height: min(56vh, 600px);
  object-fit: contain;
  border-radius: 10px;
  background: var(--bg-primary);
  transform-origin: center center;
  transition: transform 0.12s ease-out;
  cursor: zoom-in;
  user-select: none;
}

.lightbox-figure figcaption {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.zoom-hint {
  margin: 0;
  padding: 0 16px 4px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
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
  z-index: 2;
  padding: 0;
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
}

.thumb-btn img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.thumb-btn:hover,
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
  .image-lightbox {
    padding: 0;
  }

  .lightbox-panel {
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .lightbox-stage {
    padding: 8px 40px;
    min-height: 200px;
  }

  .lightbox-nav {
    width: 34px;
    height: 34px;
  }

  .zoom-hint {
    font-size: 10px;
  }
}
</style>
