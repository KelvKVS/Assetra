<template>
  <img
    v-if="displaySrc && !broken"
    v-bind="$attrs"
    :src="displaySrc"
    :alt="alt"
    loading="lazy"
    decoding="async"
    @error="onError"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })
import type { AttachmentRef } from '../types/assetra'
import { ensureAttachment } from '../utils/mediaUrl'

const props = defineProps<{
  attachment?: AttachmentRef | null
  alt?: string
}>()

const broken = ref(false)
const retry = ref(0)

const displaySrc = computed(() => {
  if (!props.attachment || broken.value) return ''
  const safe = ensureAttachment(props.attachment)
  if (!safe?.url) return ''
  if (!retry.value) return safe.url
  const joiner = safe.url.includes('?') ? '&' : '?'
  return `${safe.url}${joiner}_retry=${retry.value}`
})

watch(
  () => props.attachment,
  () => {
    broken.value = false
    retry.value = 0
  },
)

function onError() {
  if (retry.value < 2) {
    retry.value += 1
    return
  }
  broken.value = true
}
</script>
