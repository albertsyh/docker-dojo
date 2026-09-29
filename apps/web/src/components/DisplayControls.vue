<script setup lang="ts">
import { pet, togglePetShown, togglePicker } from '../pets'
import { prefs, setScale, TEXT_SCALES, toggleTheme } from '../prefs'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import LanguagePicker from './LanguagePicker.vue'

const { t } = useI18n()
</script>

<template>
  <div class="controls">
    <LanguagePicker />
    <div class="sizes" role="group" :aria-label="t('display.textSize')">
      <button
        v-for="(scale, i) in TEXT_SCALES"
        :key="scale"
        type="button"
        :class="{ on: prefs.scale === i }"
        :aria-pressed="prefs.scale === i"
        :aria-label="t(`display.sizes.${i}`)"
        :title="t(`display.sizes.${i}`)"
        :style="{ fontSize: `${0.8 + i * 0.16}rem` }"
        @click="setScale(i)"
      >
        A
      </button>
    </div>
    <!-- Both labels share one grid cell so the button never changes width. -->
    <button class="btn small swap" type="button" :title="prefs.theme === 'dark' ? t('display.toLight') : t('display.toDark')" @click="toggleTheme">
      <span :aria-hidden="prefs.theme === 'dark'"><AppIcon name="moon" />{{ t('display.dark') }}</span>
      <span :aria-hidden="prefs.theme !== 'dark'"><AppIcon name="sun" />{{ t('display.light') }}</span>
    </button>
    <button class="btn small pet-only" type="button" :aria-expanded="pet.pickerOpen" @click="togglePicker"><AppIcon name="paw" />{{ t('display.choosePet') }}</button>
    <button class="btn small ghost swap pet-only" type="button" :aria-pressed="pet.shown" @click="togglePetShown">
      <span :aria-hidden="!pet.shown">{{ t('display.hidePet') }}</span>
      <span :aria-hidden="pet.shown">{{ t('display.showPet') }}</span>
    </button>
    <a class="btn small ghost repo" href="https://github.com/albertsyh/docker-dojo" target="_blank" rel="noopener" :aria-label="t('footer.sourceOnGithub')" :title="t('footer.sourceOnGithub')">
      <!-- The GitHub mark is a filled logo, so it lives here rather than in the stroke icon set. -->
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
    </a>
  </div>
</template>

<style scoped>
.controls { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.sizes { display: grid; grid-template-columns: repeat(3, 2rem); border: 1px solid var(--border-strong); border-radius: var(--radius-md); overflow: hidden; background: var(--bg); }
.sizes button { font: inherit; font-weight: 750; color: var(--muted); background: none; border: 0; height: 2rem; line-height: 1; padding: 0; cursor: pointer; }
.sizes button + button { border-left: 1px solid var(--border); }
.sizes button:hover { color: var(--ink); }
.repo { width: 2rem; padding: 0; color: var(--muted); }
.repo:hover { color: var(--ink); }
.repo svg { width: 1.25rem; height: 1.25rem; }
.sizes button.on { color: var(--primary-ink); background: var(--primary); }
/* The pet only appears on wide screens, so its controls would be dead presses below that. */
@media (max-width: 999px) {
  .pet-only { display: none; }
}
</style>
