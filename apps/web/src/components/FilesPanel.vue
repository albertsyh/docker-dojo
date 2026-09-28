<script setup lang="ts">
import { computed } from 'vue'
import type { Exercise } from '../api'

const props = defineProps<{ files: NonNullable<Exercise['files']> }>()

const segments = (path: string) => path.replace(/\/$/, '').split('/')

// Indentation comes from path depth; each row shows just its own name.
const rows = computed(() => {
  const base = Math.min(...props.files.entries.map((e) => segments(e.path).length))
  return props.files.entries.map((e) => {
    const dir = e.path.endsWith('/')
    return { name: segments(e.path).at(-1)! + (dir ? '/' : ''), dir, depth: segments(e.path).length - base, note: e.note }
  })
})
</script>

<template>
  <aside class="card files" aria-label="Files in your working folder">
    <h2>Files</h2>
    <p v-if="files.note" class="muted note">{{ files.note }}</p>
    <ul class="tree">
      <li v-for="(row, i) in rows" :key="i" :class="{ nested: row.depth > 0 }" :style="{ '--depth': row.depth }">
        <svg v-if="row.dir" class="icon dir" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5h3.6l1.4 1.5h6a1 1 0 0 1 1 1V12.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
        </svg>
        <svg v-else class="icon file" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 1.5h6l3 3v10h-9z M9.5 1.5v3h3" />
        </svg>
        <span class="entry">
          <span class="name">{{ row.name }}</span>
          <span v-if="row.note" class="muted hint">{{ row.note }}</span>
        </span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.files { display: grid; gap: 12px; padding: 16px; }
h2 { font-size: 1rem; margin: 0; }
.note { font-size: 0.9rem; margin: 0; }
.tree { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.tree li { display: flex; gap: 8px; align-items: flex-start; padding-left: calc(var(--depth) * 1.1rem); }
/* Vertical guide line under the parent's icon. */
.tree li.nested {
  background-image: linear-gradient(var(--border), var(--border));
  background-size: 1px 100%;
  background-repeat: no-repeat;
  background-position: calc(var(--depth) * 1.1rem - 0.6rem) 0;
}
.icon { flex: none; width: 1rem; height: 1rem; margin-top: 0.2rem; }
.icon.dir { fill: color-mix(in srgb, var(--accent) 30%, transparent); stroke: var(--accent); stroke-width: 1; }
.icon.file { fill: none; stroke: var(--muted); stroke-width: 1; stroke-linejoin: round; }
.entry { display: flex; flex-direction: column; min-width: 0; }
.name { font-family: var(--mono); font-size: 0.86rem; overflow-wrap: anywhere; }
.hint { font-size: 0.8rem; line-height: 1.35; }
</style>
