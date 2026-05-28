import type { AttachmentRef } from '../types/assetra'
import type { useImageLightbox } from './useImageLightbox'

const GALLERY_ROOT =
  '.photo-preview-row, .asset-gallery, .gallery-thumbs, .att-grid, .preview-grid, .edit-attachments, .review-thumbs, .timeline-attachments'

const TILE_SELECTORS = '.att-item, .att-tile, .preview-tile, .review-thumb, .asset-cover-btn, .gallery-thumb, .thumb-btn'

function imgToAttachment(img: HTMLImageElement, index: number): AttachmentRef {
  return {
    filename: `img-${index}`,
    url: img.currentSrc || img.src,
    originalName: img.alt || undefined,
    mimetype: 'image/jpeg',
  }
}

/** Clique em qualquer <img> dentro de main.content abre o lightbox com zoom. */
export function setupGlobalImageZoom(lightbox: ReturnType<typeof useImageLightbox>) {
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return

    let img = target.closest('img')
    if (!(img instanceof HTMLImageElement)) {
      const tile = target.closest(TILE_SELECTORS)
      img = tile?.querySelector('img') ?? null
    }
    if (!(img instanceof HTMLImageElement)) return
    if (!img.src || img.src.startsWith('data:image/svg')) return
    if (img.closest('.image-lightbox') || img.closest('.btn-icon') || img.closest('[data-no-zoom]')) return

    const src = img.currentSrc || img.src
    const galleryRoot = img.closest(GALLERY_ROOT)

    if (galleryRoot) {
      const imgs = [...galleryRoot.querySelectorAll('img')].filter(
        (el) => el.src && !el.closest('.btn-icon') && !el.closest('[data-no-zoom]'),
      )
      if (!imgs.length) return
      const attachments = imgs.map((el, i) => imgToAttachment(el, i))
      const index = imgs.findIndex((el) => (el.currentSrc || el.src) === src)
      lightbox.openGallery(attachments, { startIndex: Math.max(0, index) })
      return
    }

    lightbox.openSingleUrl(src, { originalName: img.alt || undefined })
  }

  const main = document.querySelector('main.content')
  main?.addEventListener('click', onClick)

  return () => main?.removeEventListener('click', onClick)
}
