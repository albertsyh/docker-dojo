<script setup lang="ts">
import { pet, togglePetShown, togglePicker } from '../pets'
import { prefs, setScale, TEXT_SCALES, toggleTheme } from '../prefs'

const sizeNames = ['Normal', 'Large', 'Largest']
</script>

<template>
  <div class="controls">
    <span class="muted label" aria-hidden="true">Text size</span>
    <div class="sizes" role="group" aria-label="Text size">
      <button
        v-for="(scale, i) in TEXT_SCALES"
        :key="scale"
        type="button"
        :class="{ on: prefs.scale === i }"
        :aria-pressed="prefs.scale === i"
        :aria-label="`${sizeNames[i]} text`"
        :title="`${sizeNames[i]} text`"
        :style="{ fontSize: `${0.8 + i * 0.16}rem` }"
        @click="setScale(i)"
      >
        A
      </button>
    </div>
    <!-- Both labels share one grid cell so the button never changes width. -->
    <button class="theme swap" type="button" :title="`Switch to ${prefs.theme === 'dark' ? 'light' : 'dark'} mode`" @click="toggleTheme">
      <span :aria-hidden="prefs.theme === 'dark'">☾ Dark</span>
      <span :aria-hidden="prefs.theme !== 'dark'">☀ Light</span>
    </button>
    <button class="pet-toggle" type="button" :aria-expanded="pet.pickerOpen" @click="togglePicker">Choose pet</button>
    <button class="pet-toggle swap" type="button" :aria-pressed="pet.shown" @click="togglePetShown">
      <span :aria-hidden="!pet.shown">Hide pet</span>
      <span :aria-hidden="pet.shown">Show pet</span>
    </button>
  </div>
</template>

<style scoped>
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.label { font-size: 0.85rem; }
button { font: inherit; font-weight: 700; color: var(--muted); background: var(--surface); cursor: pointer; }
.sizes { display: grid; grid-template-columns: repeat(3, 2rem); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.sizes button { border: 0; height: 2rem; line-height: 1; padding: 0; }
.sizes button + button { border-left: 1px solid var(--border); }
.sizes button.on { color: var(--accent); background: var(--accent-soft); }
.theme, .pet-toggle { border: 1px solid var(--border); border-radius: 8px; height: 2rem; padding: 0 10px; font-size: 0.85rem; }
button:hover { color: var(--text); }
/* The pet only appears on wide screens, so the toggle would be a dead press below that. */
@media (max-width: 999px) {
  .pet-toggle { display: none; }
}
</style>
