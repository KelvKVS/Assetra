import { reactive } from 'vue'
import type { Asset } from '../types/assetra'
import type { AttachmentRef } from '../types/assetra'

const isImageMime = (mime?: string) => !mime || mime.startsWith('image/')

export function imageAttachments(list?: AttachmentRef[]) {
  return (list ?? []).filter((a) => isImageMime(a.mimetype))
}

const state = reactive({
  open: false,
  attachments: [] as AttachmentRef[],
  startIndex: 0,
  title: '',
})

export function useImageLightbox() {
  const openGallery = (attachments: AttachmentRef[], options?: { title?: string; startIndex?: number }) => {
    const images = imageAttachments(attachments)
    if (!images.length) return
    let index = options?.startIndex ?? 0
    if (index < 0 || index >= images.length) index = 0
    state.attachments = images
    state.startIndex = index
    state.title = options?.title ?? ''
    state.open = true
  }

  const openFromAsset = (asset: Asset, clicked?: AttachmentRef) => {
    const images = imageAttachments(asset.attachments)
    if (!images.length) return
    let index = 0
    if (clicked) {
      const found = images.findIndex((a) => a.url === clicked.url || a.filename === clicked.filename)
      if (found >= 0) index = found
    }
    openGallery(images, { title: asset.tag, startIndex: index })
  }

  const openSingleUrl = (url: string, options?: { title?: string; originalName?: string; mimetype?: string }) => {
    if (!url?.trim()) return
    openGallery(
      [
        {
          filename: 'image',
          url: url.trim(),
          originalName: options?.originalName,
          mimetype: options?.mimetype ?? 'image/jpeg',
        },
      ],
      { title: options?.title ?? '' },
    )
  }

  const close = () => {
    state.open = false
  }

  return {
    state,
    openGallery,
    openFromAsset,
    openSingleUrl,
    close,
  }
}

/** @deprecated use useImageLightbox */
export const useAssetPhotoLightbox = useImageLightbox
