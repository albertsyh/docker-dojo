<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { choosePet, pet, PETS, togglePicker } from '../pets'
import AppIcon from './AppIcon.vue'

const list = ref<HTMLElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') togglePicker()
}

onMounted(async () => {
  document.addEventListener('keydown', onKey)
  await nextTick()
  list.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="picker" role="dialog" aria-labelledby="pet-picker-title">
    <header>
      <h2 id="pet-picker-title">Choose your pet</h2>
      <button class="btn small ghost close" type="button" aria-label="Close" @click="togglePicker"><AppIcon name="x" /></button>
    </header>
    <div ref="list" class="options" role="radiogroup" aria-labelledby="pet-picker-title">
      <button
        v-for="p in PETS"
        :key="p.id"
        type="button"
        role="radio"
        class="option"
        :class="{ on: pet.id === p.id }"
        :aria-checked="pet.id === p.id"
        @click="choosePet(p.id)"
      >
        <img :src="p.thumb" alt="" width="48" height="52" />
        <span class="text">
          <strong>{{ p.name }}</strong>
          <span class="muted">{{ p.description }}</span>
        </span>
        <AppIcon v-if="pet.id === p.id" name="check" class="chosen" />
      </button>
    </div>
    <p class="muted credit">Pets by <a href="https://openpets.dev" target="_blank" rel="noopener">OpenPets</a></p>
  </section>
</template>

<style scoped>
/* Floats above the pet in the bottom-right corner. */
.picker {
  position: fixed; right: var(--space-4); bottom: 136px; z-index: var(--z-popover);
  width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 160px); overflow-y: auto;
  padding: var(--space-4); display: grid; gap: var(--space-3);
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-float);
  animation: rise var(--dur-base) var(--ease-out);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
}
header { display: flex; align-items: center; justify-content: space-between; }
h2 { font-size: var(--text-md); margin: 0; }
.close { width: 2rem; padding: 0; }
.options { display: grid; gap: var(--space-2); }
.option {
  display: flex; gap: var(--space-3); align-items: center; text-align: left; width: 100%;
  font: inherit; color: var(--ink); background: var(--bg); cursor: pointer;
  border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3);
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.option:hover { border-color: var(--ink); }
.option.on { border-color: var(--primary); background: var(--primary-soft); }
.option img { flex: none; image-rendering: pixelated; }
.text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.text .muted { font-size: var(--text-xs); line-height: 1.4; }
.chosen { flex: none; width: 1.2rem; height: 1.2rem; color: var(--primary); }
.credit { font-size: var(--text-xs); margin: 0; }
@media (max-width: 999px) {
  .picker { display: none; }
}
</style>
