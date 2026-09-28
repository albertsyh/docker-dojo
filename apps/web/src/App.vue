<script setup lang="ts">
import { computed } from 'vue'
import DisplayControls from './components/DisplayControls.vue'
import PetCompanion from './components/PetCompanion.vue'
import PetPicker from './components/PetPicker.vue'
import { pet } from './pets'
import { completed, state } from './store'

const exerciseCount = computed(() => state.content?.exercises.length ?? 0)
</script>

<template>
  <header class="top">
    <div class="container top-inner">
      <RouterLink to="/" class="brand">
        <img src="/favicon.svg" alt="" width="26" height="26" />
        Docker Dojo
      </RouterLink>
      <nav>
        <RouterLink to="/exercises">Exercises</RouterLink>
        <RouterLink to="/quiz">Quiz</RouterLink>
        <RouterLink to="/live" class="live">Live</RouterLink>
      </nav>
      <div v-if="state.progress" class="me" :title="`Your participant id: ${state.progress.id}`">
        <span class="me-id">{{ state.progress.id }}</span>
        <span class="pill" :class="{ ok: completed.size === exerciseCount }">{{ completed.size }}/{{ exerciseCount }}</span>
        <span v-if="state.progress.quiz" class="pill" :class="{ ok: state.progress.quiz.passed }">
          quiz {{ state.progress.quiz.bestScore }}/{{ state.progress.quiz.total }}
        </span>
      </div>
    </div>
  </header>

  <main class="container main">
    <p v-if="state.loading" class="muted">Loading…</p>
    <div v-else-if="state.error" class="error">Could not reach the Dojo API: {{ state.error }}</div>
    <RouterView v-else />
  </main>

  <footer class="foot" :class="{ 'with-pet': pet.shown }">
    <div class="container foot-inner">
      <span class="muted">Docker Dojo · Vibe-coded with AI by <a href="https://github.com/albertsyh" target="_blank" rel="noopener">albertsyh</a> · Pets by <a href="https://openpets.dev" target="_blank" rel="noopener">OpenPets</a></span>
      <DisplayControls />
    </div>
  </footer>

  <PetCompanion v-if="pet.shown" />
  <PetPicker v-if="pet.pickerOpen" />
</template>

<style scoped>
.top { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
.top-inner { display: flex; align-items: center; gap: 20px; min-height: 60px; flex-wrap: wrap; padding-block: 8px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; color: var(--text); text-decoration: none; letter-spacing: -0.01em; }
nav { display: flex; gap: 4px; }
nav a { color: var(--muted); text-decoration: none; font-weight: 600; padding: 6px 12px; border-radius: 8px; }
nav a:hover { color: var(--text); background: var(--surface-2); }
nav a.router-link-active { color: var(--accent); background: var(--accent-soft); }
.live::before { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--ok); margin-right: 6px; vertical-align: 2px; }
.me { margin-left: auto; display: flex; gap: 6px; align-items: center; }
.me-id { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); }
.main { flex: 1; width: 100%; padding-top: 28px; padding-bottom: 64px; }
.foot { background: var(--surface); border-top: 1px solid var(--border); }
.foot-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-block: 12px; font-size: 0.9rem; }
/* Keep the footer controls clear of the pet (fixed, 96px wide, 16px from the right edge).
   The container's own side margin counts towards the gap on wide screens. */
@media (min-width: 1000px) {
  .foot.with-pet .foot-inner { padding-right: max(16px, calc(128px - max(0px, (100vw - 1180px) / 2))); }
}
@media (max-width: 560px) {
  .me-id { display: none; }
}
</style>
