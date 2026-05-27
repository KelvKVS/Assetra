import { ref } from 'vue'
import type { Asset, AttachmentRef } from '../types/assetra'

const isImageMime = (mime?: string) => !mime || mime.startsWith('image/')

export function imageAttachments(list?: AttachmentRef[]) {
  return (list ?? []).filter((a) => isImageMime(a.mimetype))
}

export function useAssetPhotoLightbox() {
  const lightboxOpen = ref(false)
  const lightboxAttachments = ref<AttachmentRef[]>([])
  const lightboxIndex = ref(0)
  const lightboxTitle = ref('')

  const openGallery = (asset: Asset, clicked?: AttachmentRef) => {
    const images = imageAttachments(asset.attachments)
    if (!images.length) return

    let index = 0
    if (clicked) {
      const found = images.findIndex((a) => a.url === clicked.url || a.filename === clicked.filename)
      if (found >= 0) index = found
    }

    lightboxAttachments.value = images
    lightboxIndex.value = index
    lightboxTitle.value = asset.tag
    lightboxOpen.value = true
  }

  const closeGallery = () => {
    lightboxOpen.value = false
  }

  return {
    lightboxOpen,
    lightboxAttachments,
    lightboxIndex,
    lightboxTitle,
    openGallery,
    closeGallery,
  }
}
