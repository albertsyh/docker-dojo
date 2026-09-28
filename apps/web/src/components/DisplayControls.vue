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
  </div>
</template>

<style scoped>
.controls { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.sizes { display: grid; grid-template-columns: repeat(3, 2rem); border: 1px solid var(--border-strong); border-radius: var(--radius-md); overflow: hidden; background: var(--bg); }
.sizes button { font: inherit; font-weight: 750; color: var(--muted); background: none; border: 0; height: 2rem; line-height: 1; padding: 0; cursor: pointer; }
.sizes button + button { border-left: 1px solid var(--border); }
.sizes button:hover { color: var(--ink); }
.sizes button.on { color: var(--primary-ink); background: var(--primary); }
/* The pet only appears on wide screens, so its controls would be dead presses below that. */
@media (max-width: 999px) {
  .pet-only { display: none; }
}
</style>
