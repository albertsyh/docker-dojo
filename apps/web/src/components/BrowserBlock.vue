<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// A step that asks the student to look at a page, drawn like a code block so it is as hard to
// miss as a command. The URL is on the student's own machine, so it opens in a new tab.
defineProps<{ url: string }>()
</script>

<template>
  <div class="browser">
    <div class="browser-head">
      <span class="browser-label"><AppIcon name="globe" />{{ t('code.browser') }}</span>
      <a class="open" :href="url" target="_blank" rel="noopener" :aria-label="t('code.openLabel', { url })"><AppIcon name="external" />{{ t('code.open') }}</a>
    </div>
    <a class="address" :href="url" target="_blank" rel="noopener">{{ url }}</a>
  </div>
</template>

<style scoped>
.browser { background: var(--code); border: 1px solid var(--code-edge); border-radius: var(--radius-md); overflow: hidden; }
.browser-head {
  display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
  min-height: calc(1.9rem + 2 * var(--space-1) + 1px);
  padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
  border-bottom: 1px solid var(--code-rule);
}
.browser-label { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--mono); font-size: var(--text-xs); color: var(--code-muted); }
.browser-label svg, .open svg { width: 0.95rem; height: 0.95rem; }
.open {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-size: var(--text-xs); font-weight: 650; color: var(--code-text); text-decoration: none;
  min-height: 1.9rem; padding: 0 var(--space-3); border-radius: var(--radius-sm);
  background: var(--code-button); border: 1px solid var(--code-button-edge);
  transition: background-color var(--dur-fast) var(--ease-out);
}
.open:hover { background: var(--code-button-hover); }
.open:focus-visible, .address:focus-visible { outline-color: var(--code-prompt); }
.address {
  display: block; padding: var(--space-3) var(--space-4) var(--space-4);
  font-family: var(--mono); font-size: var(--text-sm); line-height: 1.7; color: var(--code-text);
  overflow-wrap: anywhere; text-underline-offset: 0.2em;
}
</style>
