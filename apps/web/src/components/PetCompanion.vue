<script setup lang="ts">
import { computed } from 'vue'
import { chat, toggleChat, unread } from '../chat'
import { animationFor, currentPet, pet, petReact } from '../pets'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const current = computed(currentPet)

// The pet is the way into the questions chat. It waves when the chat opens.
function onClick() {
  toggleChat()
  if (chat.open) petReact('wave')
}
const label = computed(() => {
  const action = t(chat.open ? 'pet.close' : 'pet.open')
  return unread.value ? t('pet.labelUnread', { name: current.value.name, action, n: unread.value }) : t('pet.label', { name: current.value.name, action })
})

const style = computed(() => {
  const a = animationFor(pet.row)
  return {
    backgroundImage: `url(${current.value.sheet})`,
    '--row': pet.row,
    '--frames': a.frames,
    '--duration': `${a.duration}ms`,
    '--iterations': a.iterations === Infinity ? 'infinite' : a.iterations,
  }
})
</script>

<template>
  <!-- Pets are from OpenPets (openpets.dev). Credited in the footer and README. -->
  <button class="pet" type="button" :aria-label="label" :aria-expanded="chat.open" :title="t('pet.title', { name: current.name })" @click="onClick">
    <span :key="`${pet.id}-${pet.seq}`" class="sprite" :style="style" />
    <span v-if="unread" class="unread" aria-hidden="true">{{ unread > 9 ? '9+' : unread }}</span>
  </button>
</template>

<style scoped>
.pet {
  position: fixed; right: 16px; bottom: 16px; z-index: var(--z-float);
  padding: 0; border: 0; background: none; cursor: pointer; line-height: 0;
}
.unread {
  position: absolute; top: 6px; left: 6px; min-width: 1.4rem; height: 1.4rem; padding: 0 0.35rem;
  display: grid; place-items: center; border-radius: 999px; line-height: 1;
  font-size: var(--text-xs); font-weight: 800; font-variant-numeric: tabular-nums;
  color: var(--highlight-ink); background: var(--highlight); box-shadow: 0 0 0 2px var(--bg);
}
.pet:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: var(--radius-lg); }
.sprite {
  display: block;
  /* 96x104 frames in an 8 x 9 grid (FRAME_W / FRAME_H in pets.ts). */
  width: 96px;
  height: 104px;
  background-size: 768px 936px;
  background-position: 0 calc(var(--row) * -104px);
  image-rendering: pixelated;
  animation: play var(--duration) steps(var(--frames)) var(--iterations);
}
@keyframes play {
  from { background-position-x: 0; }
  to { background-position-x: calc(var(--frames) * -96px); }
}
/* Only where the right-hand gutter is free; below this it would cover content. */
@media (max-width: 999px) {
  .pet { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sprite { animation: none; }
}
</style>
