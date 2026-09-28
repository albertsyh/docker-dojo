<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { codeLabel } from '../i18n'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/** A code block with typing gaps where the code says {{1}}, {{2}}... */
const props = defineProps<{
  code: string
  label: string
  modelValue: string[]
  disabled?: boolean
  /** After grading: which blanks were right. */
  verdicts?: boolean[]
  name: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const parts = computed(() =>
  props.code.split(/\{\{(\d+)\}\}/).map((text, i) => (i % 2 === 1 ? { blank: Number(text) - 1 } : { text })),
)
const count = computed(() => parts.value.filter((p) => 'blank' in p).length)

function set(index: number, value: string) {
  const next = [...props.modelValue]
  next[index] = value
  emit('update:modelValue', next)
}

// Grows with what is typed, so a long answer is never hidden, and says nothing about the answer's length.
const width = (value: string) => `${Math.max(7, value.length + 2)}ch`
</script>

<template>
  <div class="code">
    <div class="code-head">
      <span class="code-label"><AppIcon :name="label === 'terminal' ? 'terminal' : 'file'" />{{ codeLabel(label) }}</span>
      <span class="hint">{{ t('code.blanks', count) }}</span>
    </div>
    <pre><code><template v-for="(part, i) in parts" :key="i"><template v-if="'text' in part">{{ part.text }}</template><input
      v-else
      class="blank"
      :class="verdicts ? (verdicts[part.blank] ? 'ok' : 'bad') : ''"
      type="text"
      :name="`${name}-${part.blank + 1}`"
      :value="modelValue[part.blank]"
      :style="{ width: width(modelValue[part.blank] ?? '') }"
      :disabled="disabled"
      :aria-label="t('code.blankLabel', { n: part.blank + 1, total: count })"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      @input="set(part.blank, ($event.target as HTMLInputElement).value)"
    /></template></code></pre>
  </div>
</template>

<style scoped>
.code { background: var(--code); border-radius: var(--radius-md); overflow: hidden; }
.code-head {
  display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
  min-height: 2.4rem; padding: var(--space-1) var(--space-3);
  border-bottom: 1px solid oklch(1 0 0 / 0.08);
}
.code-label { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--mono); font-size: var(--text-xs); color: var(--code-muted); }
.code-label svg { width: 0.95rem; height: 0.95rem; }
.hint { font-size: var(--text-xs); color: var(--code-muted); }
pre { margin: 0; padding: var(--space-3) var(--space-4) var(--space-4); overflow-x: auto; }
pre code { background: none; padding: 0; border-radius: 0; color: var(--code-text); font-size: var(--text-sm); line-height: 2; white-space: pre; }

/* The gap: a dashed slot in the highlighter colour, so it reads as "write here". */
.blank {
  font: inherit; color: var(--code-text); min-width: 7ch; max-width: 40ch; padding: 0 0.4ch; margin: 0 0.2ch;
  background: oklch(1 0 0 / 0.08); border: 0; border-bottom: 2px dashed var(--highlight); border-radius: 3px 3px 0 0;
  vertical-align: baseline;
}
.blank:focus-visible { outline: 2px solid var(--highlight); outline-offset: 1px; background: oklch(1 0 0 / 0.14); }
.blank.ok { border-bottom: 2px solid var(--code-prompt); background: oklch(0.78 0.13 145 / 0.16); }
.blank.bad { border-bottom: 2px solid oklch(0.72 0.16 27); background: oklch(0.72 0.16 27 / 0.18); }
.blank:disabled { cursor: default; }
</style>
