<template>
  <div v-if="attachments?.length" class="attachment-grid-wrap">
    <span v-if="showTitle" class="att-title">
      <Paperclip :size="13" />
      {{ title }}
    </span>
    <div class="att-grid">
      <button
        v-for="(att, idx) in attachments"
        :key="`${att.filename}-${idx}`"
        type="button"
        class="att-item"
        :title="att.originalName ?? att.filename"
        @click.stop="onOpen(att)"
      >
        <img
          v-if="isImageAttachment(att.mimetype, att.filename ?? att.originalName)"
          :src="att.url"
          :alt="att.originalName ?? att.filename"
        />
        <FileSpreadsheet
          v-else-if="kindOf(att) === 'spreadsheet'"
          :size="24"
          :stroke-width="2"
        />
        <FileText v-else :size="24" :stroke-width="2" />
        <span class="att-name">{{ att.originalName ?? att.filename }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileSpreadsheet, FileText, Paperclip } from 'lucide-vue-next'
import type { AttachmentRef } from '../types/assetra'
import { attachmentKind, isImageAttachment } from '../constants/attachmentTypes'
import { useImageLightbox } from '../composables/useImageLightbox'

const lightbox = useImageLightbox()

const props = withDefaults(
  defineProps<{
    attachments?: AttachmentRef[]
    title?: string
    showTitle?: boolean
    galleryTitle?: string
  }>(),
  {
    title: 'Anexos',
    showTitle: true,
    galleryTitle: '',
  },
)

function kindOf(att: AttachmentRef) {
  return attachmentKind(att.mimetype, att.filename ?? att.originalName)
}

function onOpen(att: AttachmentRef) {
  if (isImageAttachment(att.mimetype, att.filename ?? att.originalName)) {
    const images = (props.attachments ?? []).filter((a) =>
      isImageAttachment(a.mimetype, a.filename ?? a.originalName),
    )
    const idx = images.findIndex((a) => a.url === att.url || a.filename === att.filename)
    lightbox.openGallery(props.attachments ?? [], {
      title: props.galleryTitle || props.title,
      startIndex: idx >= 0 ? idx : 0,
    })
    return
  }
  if (att.url) window.open(att.url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.attachment-grid-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.att-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.att-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.att-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 88px;
  padding: 8px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-primary);
  cursor: pointer;
  color: var(--text-secondary);
  transition: border-color 0.15s, transform 0.15s;
}
.att-item:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.att-item img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}
.att-name {
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
