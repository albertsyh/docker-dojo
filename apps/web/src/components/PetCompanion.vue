<script setup lang="ts">
import { computed } from 'vue'
import { animationFor, currentPet, pet, petSurprise } from '../pets'

const current = computed(currentPet)

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
  <button class="pet" type="button" :aria-label="`${current.name}. Press for a surprise.`" :title="`Hi, I'm ${current.name}!`" @click="petSurprise">
    <span :key="`${pet.id}-${pet.seq}`" class="sprite" :style="style" />
  </button>
</template>

<style scoped>
.pet {
  position: fixed; right: 16px; bottom: 16px; z-index: 20;
  padding: 0; border: 0; background: none; cursor: pointer; line-height: 0;
}
.pet:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent) 45%, transparent); outline-offset: 2px; border-radius: 12px; }
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
