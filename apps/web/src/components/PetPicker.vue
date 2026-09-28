<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { choosePet, pet, PETS, togglePicker } from '../pets'

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
  <section class="picker card" role="dialog" aria-labelledby="pet-picker-title">
    <header>
      <h2 id="pet-picker-title">Choose your pet</h2>
      <button class="close" type="button" aria-label="Close" @click="togglePicker">✕</button>
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
      </button>
    </div>
    <p class="muted credit">Pets by <a href="https://openpets.dev" target="_blank" rel="noopener">OpenPets</a></p>
  </section>
</template>

<style scoped>
/* Sits above the pet in the bottom-right corner. */
.picker {
  position: fixed; right: 16px; bottom: 136px; z-index: 30;
  width: min(340px, calc(100vw - 32px)); max-height: calc(100vh - 160px); overflow-y: auto;
  padding: 14px; display: grid; gap: 10px;
  box-shadow: 0 12px 32px rgb(16 24 40 / 0.18);
}
header { display: flex; align-items: center; justify-content: space-between; }
h2 { font-size: 1rem; margin: 0; }
.close {
  font: inherit; width: 2rem; height: 2rem; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--border); background: var(--surface); color: var(--muted);
}
.close:hover { color: var(--text); }
.options { display: grid; gap: 6px; }
.option {
  display: flex; gap: 12px; align-items: center; text-align: left; width: 100%;
  font: inherit; color: var(--text); background: var(--surface); cursor: pointer;
  border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px;
}
.option:hover { border-color: var(--accent); }
.option.on { border-color: var(--accent); background: var(--accent-soft); }
.option img { flex: none; image-rendering: pixelated; }
.text { display: flex; flex-direction: column; min-width: 0; }
.text .muted { font-size: 0.82rem; line-height: 1.35; }
.credit { font-size: 0.8rem; margin: 0; }
@media (max-width: 999px) {
  .picker { display: none; }
}
</style>
