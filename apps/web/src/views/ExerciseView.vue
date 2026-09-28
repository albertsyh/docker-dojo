<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeBlock from '../components/CodeBlock.vue'
import FilesPanel from '../components/FilesPanel.vue'
import JoinGate from '../components/JoinGate.vue'
import { completed, setDone, state } from '../store'

const props = defineProps<{ id: string }>()

const list = computed(() => state.content?.exercises ?? [])
const index = computed(() => list.value.findIndex((e) => e.id === props.id))
const exercise = computed(() => list.value[index.value])
const prev = computed(() => list.value[index.value - 1])
const next = computed(() => list.value[index.value + 1])
const isDone = computed(() => completed.value.has(props.id))

const busy = ref(false)
const error = ref('')

async function toggle() {
  busy.value = true
  error.value = ''
  try {
    await setDone(props.id, !isDone.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="!exercise" class="card">
    <p>That exercise doesn't exist. <RouterLink to="/exercises">Back to the list</RouterLink></p>
  </div>
  <article v-else class="layout" :class="{ 'has-files': exercise.files }">
    <div class="intro">
      <RouterLink to="/exercises" class="muted back">← All exercises</RouterLink>
      <p class="muted eyebrow">Exercise {{ index + 1 }} of {{ list.length }} · {{ exercise.minutes }} min</p>
      <h1>{{ exercise.title }}</h1>
      <p class="muted">{{ exercise.summary }}</p>
    </div>

    <FilesPanel v-if="exercise.files" :files="exercise.files" class="side" />

    <div class="content stack">

    <ol class="steps">
      <li v-for="(step, i) in exercise.steps" :key="i" class="step">
        <p>{{ step.text }}</p>
        <p v-for="note in step.notes" :key="note.for" class="note">
          <span class="note-for">{{ note.for }}</span>
          {{ note.text }}
        </p>
        <CodeBlock v-if="step.code" :code="step.code" :label="step.label" />
      </li>
    </ol>

    <div class="card expected">
      <strong>You should see</strong>
      <p style="margin: 0">{{ exercise.expected }}</p>
    </div>

    <div class="row actions">
      <button class="btn swap" :class="isDone ? 'done' : 'primary'" type="button" :disabled="busy" :aria-pressed="isDone" @click="toggle">
        <span :aria-hidden="isDone">Mark as done</span>
        <span :aria-hidden="!isDone">Done ✓ (click to undo)</span>
      </button>
      <span class="spacer" />
      <RouterLink v-if="prev" :to="`/exercises/${prev.id}`" class="btn">← Previous</RouterLink>
      <RouterLink v-if="next" :to="`/exercises/${next.id}`" class="btn" :class="{ primary: isDone }">Next →</RouterLink>
      <RouterLink v-else to="/quiz" class="btn" :class="{ primary: isDone }">Take the quiz →</RouterLink>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    </div>
  </article>
</template>

<style scoped>
.layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 820px); }
/* Wide screens: files panel on the right, sticky while the steps scroll.
   The steps column is the same width with or without the panel. */
@media (min-width: 900px) {
  .layout.has-files { grid-template-columns: minmax(0, 820px) 300px; column-gap: 28px; align-items: start; }
  .intro { grid-column: 1; }
  .content { grid-column: 1; }
  .side { grid-column: 2; grid-row: 1 / span 2; position: sticky; top: 5.5rem; max-height: calc(100vh - 7rem - 120px); overflow-y: auto; } /* 120px: room for the pet */
}
.back { text-decoration: none; font-size: 0.9rem; }
.eyebrow { margin: 12px 0 4px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
/* minmax(0, 1fr): without it the column grows to the longest code line and overflows into the panel. */
.steps { margin: 0; padding-left: 1.4rem; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.step::marker { font-weight: 700; color: var(--accent); }
.step p { margin-bottom: 8px; }
.note { font-size: 0.92rem; color: var(--muted); padding: 8px 12px; border-radius: 8px; background: var(--surface-2); }
.note-for { font-weight: 700; color: var(--text); margin-right: 4px; }
.note-for::after { content: ':'; }
.expected { border-left: 4px solid var(--ok); }
.actions { padding-top: 4px; }
.spacer { flex: 1; }
</style>
