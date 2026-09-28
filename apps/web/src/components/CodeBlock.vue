<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { copyText } from '../clipboard'

const props = defineProps<{ code: string; label?: string }>()
const copied = ref(false)

// Shell commands get a "$" prompt per line. It is drawn with CSS, so it is never copied.
const isShell = computed(() => props.label === 'terminal' || props.label === 'inside the container')
const lines = computed(() => props.code.split('\n'))
let timer: number | undefined

async function copy() {
  await copyText(props.code)
  copied.value = true
  clearTimeout(timer)
  timer = window.setTimeout(() => (copied.value = false), 1500)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="code" :class="{ shell: isShell }">
    <div class="code-head">
      <span class="code-label"><AppIcon :name="isShell ? 'terminal' : 'file'" />{{ label ?? 'code' }}</span>
      <button class="copy swap" type="button" @click="copy" :aria-label="copied ? 'Copied' : `Copy ${label ?? 'code'} to clipboard`">
        <span :aria-hidden="copied"><AppIcon name="copy" />Copy</span>
        <span :aria-hidden="!copied"><AppIcon name="check" />Copied</span>
      </button>
    </div>
    <pre><code><template v-if="isShell"><span v-for="(line, i) in lines" :key="i" class="line">{{ line }}</span></template><template v-else>{{ code }}</template></code></pre>
  </div>
</template>

<style scoped>
.code { background: var(--code); border-radius: var(--radius-md); overflow: hidden; }
.code-head {
  display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
  padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
  border-bottom: 1px solid oklch(1 0 0 / 0.08);
}
.code-label { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--mono); font-size: var(--text-xs); color: var(--code-muted); }
.code-label svg { width: 0.95rem; height: 0.95rem; }
.copy {
  font: inherit; font-size: var(--text-xs); font-weight: 650; color: var(--code-text); cursor: pointer;
  min-height: 1.9rem; padding: 0 var(--space-3); border-radius: var(--radius-sm);
  background: oklch(1 0 0 / 0.06); border: 1px solid oklch(1 0 0 / 0.12);
  transition: background-color var(--dur-fast) var(--ease-out);
}
.copy:hover { background: oklch(1 0 0 / 0.14); }
.copy:focus-visible { outline-color: var(--code-prompt); }
.copy svg { width: 0.95rem; height: 0.95rem; }
pre { margin: 0; padding: var(--space-3) var(--space-4) var(--space-4); overflow-x: auto; }
pre code { background: none; padding: 0; border-radius: 0; color: var(--code-text); font-size: var(--text-sm); line-height: 1.7; white-space: pre; }
.line { display: block; }
.line::before { content: '$ '; color: var(--code-prompt); user-select: none; }
</style>
