<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LANGUAGES, prefs, setLang } from '../prefs'

// Every language is on screen at once, each named in its own language, in equal columns so the
// group never changes size. Used in the footer and in the phone menu.
const { t } = useI18n()
</script>

<template>
  <div class="langs" role="group" :aria-label="t('display.language')">
    <button
      v-for="l in LANGUAGES"
      :key="l.code"
      type="button"
      :lang="l.html"
      :class="{ on: prefs.lang === l.code }"
      :aria-pressed="prefs.lang === l.code"
      @click="setLang(l.code)"
    >
      {{ l.name }}
    </button>
  </div>
</template>

<style scoped>
.langs {
  display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr;
  border: 1px solid var(--border-strong); border-radius: var(--radius-md); overflow: hidden; background: var(--bg);
}
.langs button {
  font: inherit; font-size: var(--text-xs); font-weight: 650; color: var(--muted); background: none; border: 0;
  min-height: 2rem; padding: 0 var(--space-3); cursor: pointer; white-space: nowrap;
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.langs button + button { border-left: 1px solid var(--border); }
.langs button:hover { color: var(--ink); }
.langs button.on { color: var(--primary-ink); background: var(--primary); }
.langs button:focus-visible { outline-offset: -2px; }
</style>
