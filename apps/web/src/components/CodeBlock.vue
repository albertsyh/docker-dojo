<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps<{ code: string; label?: string }>()
const copied = ref(false)
let timer: number | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
  } catch {
    // Clipboard API needs https or localhost; fall back to a hidden textarea.
    const ta = document.createElement('textarea')
    ta.value = props.code
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  clearTimeout(timer)
  timer = window.setTimeout(() => (copied.value = false), 1500)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="code">
    <div class="code-head">
      <span class="code-label">{{ label ?? 'code' }}</span>
      <button class="copy swap" type="button" @click="copy" :aria-label="copied ? 'Copied' : 'Copy to clipboard'">
        <span :aria-hidden="copied">Copy</span>
        <span :aria-hidden="!copied">Copied ✓</span>
      </button>
    </div>
    <pre><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.code { background: var(--code-bg); border-radius: 10px; overflow: hidden; }
.code-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px 6px 14px; border-bottom: 1px solid rgb(255 255 255 / 0.08); }
.code-label { font-family: var(--mono); font-size: 0.78rem; color: var(--code-label); }
.copy {
  font: inherit; font-size: 0.8rem; font-weight: 600; color: var(--code-text); cursor: pointer;
  background: rgb(255 255 255 / 0.08); border: 1px solid rgb(255 255 255 / 0.12); border-radius: 7px; padding: 4px 10px;
}
.copy:hover { background: rgb(255 255 255 / 0.16); }
pre { margin: 0; padding: 14px; overflow-x: auto; }
pre code { background: none; padding: 0; color: var(--code-text); font-size: 0.88rem; line-height: 1.6; white-space: pre; }
</style>
