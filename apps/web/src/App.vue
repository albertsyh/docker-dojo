<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './components/AppIcon.vue'
import DisplayControls from './components/DisplayControls.vue'
import PetCompanion from './components/PetCompanion.vue'
import PetPicker from './components/PetPicker.vue'
import ChatPopup from './components/ChatPopup.vue'
import { chat, unread } from './chat'
import { pet } from './pets'
import { completed, state } from './store'

// Small screens fold the nav into a menu. It closes when you navigate or press Esc.
const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (menuOpen.value = false))
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// ?embed (for example /live?embed) drops the header, footer and pet, for showing a page in an iframe.
const embed = computed(() => route.query.embed !== undefined)

const exerciseCount = computed(() => state.content?.exercises.length ?? 0)
// The quiz counts as one more step on the journey, done once it's passed.
const journeyPct = computed(() => {
  if (!state.progress || !exerciseCount.value) return 0
  const quizDone = state.progress.quiz?.passed ? 1 : 0
  return ((completed.value.size + quizDone) / (exerciseCount.value + 1)) * 100
})
</script>

<template>
  <header v-if="!embed" class="top">
    <div class="container top-inner">
      <RouterLink to="/" class="brand">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span>Docker Dojo</span>
      </RouterLink>
      <nav id="main-nav" aria-label="Main" :class="{ open: menuOpen }">
        <RouterLink to="/exercises">Exercises</RouterLink>
        <RouterLink to="/quiz">Quiz</RouterLink>
        <RouterLink to="/chat">Chat<span v-if="unread" class="unread" :aria-label="`${unread} new`">{{ unread > 9 ? '9+' : unread }}</span></RouterLink>
        <RouterLink to="/glossary">Glossary</RouterLink>
        <RouterLink to="/references">References</RouterLink>
        <RouterLink to="/live" class="live"><i aria-hidden="true" />Live</RouterLink>
        <p v-if="state.progress" class="nav-id muted">You are <code>{{ state.progress.id }}</code></p>
      </nav>
      <div v-if="state.progress" class="me" :title="`Your participant id: ${state.progress.id}`">
        <span class="me-id">{{ state.progress.id }}</span>
        <span class="tag" :class="{ ok: completed.size === exerciseCount }">
          <AppIcon v-if="completed.size === exerciseCount" name="check" class="tag-icon" />{{ completed.size }}/{{ exerciseCount }}
        </span>
        <span v-if="state.progress.quiz" class="tag quiz-tag" :class="{ ok: state.progress.quiz.passed }">
          Quiz {{ state.progress.quiz.bestScore }}/{{ state.progress.quiz.total }}
        </span>
      </div>
      <!-- Both labels share one grid cell so the button keeps its width. -->
      <button class="btn small ghost swap menu-btn" type="button" aria-controls="main-nav" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <span :aria-hidden="menuOpen"><AppIcon name="menu" />Menu</span>
        <span :aria-hidden="!menuOpen"><AppIcon name="x" />Close</span>
      </button>
    </div>
    <div
      v-if="state.progress"
      class="rail"
      role="progressbar"
      aria-label="Your progress through the Dojo"
      :aria-valuenow="Math.round(journeyPct)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ transform: `scaleX(${journeyPct / 100})` }" />
    </div>
  </header>

  <main class="container main" :class="{ embed }">
    <p v-if="state.loading" class="muted">Loading…</p>
    <div v-else-if="state.error" class="callout error">
      <AppIcon name="alert" />
      <span>Could not reach the Dojo API: {{ state.error }}</span>
    </div>
    <RouterView v-else />
  </main>

  <footer v-if="!embed" class="foot" :class="{ 'with-pet': pet.shown }">
    <div class="container foot-inner">
      <p class="credits muted">
        Docker Dojo · Vibe-coded with AI by <a href="https://github.com/albertsyh" target="_blank" rel="noopener">albertsyh</a>
        · Pets by <a href="https://openpets.dev" target="_blank" rel="noopener">OpenPets</a>
        <br />
        Unofficial. Not affiliated with or endorsed by Docker, Inc. Docker is a trademark of Docker, Inc.
      </p>
      <DisplayControls />
    </div>
  </footer>

  <PetCompanion v-if="pet.shown && !embed" />
  <PetPicker v-if="pet.pickerOpen" />
  <ChatPopup v-if="chat.open && pet.shown && !embed && route.path !== '/chat'" />
</template>

<style scoped>
.top { background: var(--bg); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: var(--z-sticky); }
.top-inner { display: flex; align-items: center; gap: var(--space-5); min-height: 64px; flex-wrap: wrap; padding-block: var(--space-2); }
.brand { display: flex; align-items: center; gap: var(--space-3); font-weight: 800; font-size: var(--text-lg); color: var(--ink); text-decoration: none; letter-spacing: -0.02em; }
.brand img { border-radius: var(--radius-sm); }
nav { display: flex; gap: var(--space-1); }
nav a {
  position: relative; display: inline-flex; align-items: center; gap: var(--space-2);
  color: var(--muted); text-decoration: none; font-weight: 600; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
nav a:hover { color: var(--ink); background: var(--panel); }
/* Current page: ink text with a short green underline, not a filled pill. */
nav a.router-link-active { color: var(--ink); }
nav a.router-link-active::after {
  content: ''; position: absolute; left: var(--space-3); right: var(--space-3); bottom: 2px; height: 2px; border-radius: 2px; background: var(--primary);
}
.unread {
  min-width: 1.25rem; height: 1.25rem; padding: 0 0.3rem; display: inline-grid; place-items: center; border-radius: 999px;
  font-size: var(--text-xs); font-weight: 800; font-variant-numeric: tabular-nums; color: var(--highlight-ink); background: var(--highlight);
}
.live i { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
.me { margin-left: auto; display: flex; gap: var(--space-2); align-items: center; }
.me-id { font-family: var(--mono); font-size: var(--text-xs); color: var(--muted); }
.tag-icon { width: 0.9rem; height: 0.9rem; }
/* Journey progress along the bottom edge of the header. */
.rail { position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; }
.rail > span { display: block; height: 100%; background: var(--primary); transform-origin: left; transition: transform var(--dur-slow) var(--ease-out); }
.main { flex: 1; width: 100%; padding-top: var(--space-7); padding-bottom: var(--space-8); }
.main.embed { padding-block: var(--space-5); }
.foot { border-top: 1px solid var(--border); background: var(--panel); }
.foot-inner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3) var(--space-5); flex-wrap: wrap; padding-block: var(--space-4); }
.credits { margin: 0; font-size: var(--text-sm); }
/* Keep the footer controls clear of the pet (fixed, 96px wide, 16px from the right edge).
   The container's own side margin counts towards the gap on wide screens. */
@media (min-width: 1000px) {
  .foot.with-pet .foot-inner { padding-right: max(16px, calc(128px - max(0px, (100vw - 1180px) / 2))); }
}

.menu-btn { display: none; }
.nav-id { display: none; }

/* Six links, the brand and your tags fit one row from about 1024px. Below 1280px the id
   text goes first (your tags stay); it is on the start page and in the menu. */
@media (max-width: 1279px) {
  .me-id { display: none; }
}

/* Small screens: brand, your tags and a Menu button on one row.
   The links drop down as a full-width panel under the header. */
@media (max-width: 1023px) {
  .top-inner { flex-wrap: nowrap; gap: var(--space-3); }
  .brand { flex: none; }
  .me { min-width: 0; }
  .me-id { display: none; }
  .menu-btn { display: inline-grid; flex: none; margin-left: auto; }
  .me + .menu-btn { margin-left: 0; }
  nav {
    display: none; position: absolute; top: 100%; left: 0; right: 0;
    flex-direction: column; gap: 0; padding: var(--space-2) var(--space-4) var(--space-4);
    background: var(--bg); border-bottom: 1px solid var(--border); box-shadow: var(--shadow-float);
  }
  nav.open { display: flex; }
  nav a { min-height: 3rem; padding: 0 var(--space-3); font-size: var(--text-md); }
  nav a.router-link-active { background: var(--primary-soft); }
  nav a.router-link-active::after { display: none; }
  .nav-id { display: block; margin: var(--space-3) var(--space-3) 0; padding-top: var(--space-3); border-top: 1px solid var(--border); font-size: var(--text-sm); overflow-wrap: anywhere; }
}
/* Very narrow phones: keep only the exercise count. */
@media (max-width: 400px) {
  .brand span { font-size: var(--text-md); }
  .me .quiz-tag { display: none; }
}
/* Smallest phones: the logo alone stands for the brand (the name stays for screen readers). */
@media (max-width: 360px) {
  .brand span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
</style>
