<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
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
  <div v-else-if="!exercise" class="callout">
    <AppIcon name="info" />
    <span>That exercise doesn't exist. <RouterLink to="/exercises">Back to the list</RouterLink></span>
  </div>
  <article v-else class="layout" :class="{ 'has-files': exercise.files }">
    <header class="intro">
      <RouterLink to="/exercises" class="back"><AppIcon name="arrow-left" />All exercises</RouterLink>
      <!-- Where you are in the course: one segment per exercise, each a shortcut. -->
      <nav class="stepper" aria-label="Exercises">
        <RouterLink
          v-for="(ex, i) in list"
          :key="ex.id"
          :to="`/exercises/${ex.id}`"
          class="seg"
          :class="{ done: completed.has(ex.id), current: i === index }"
          :aria-label="`Exercise ${i + 1}: ${ex.title}${completed.has(ex.id) ? ' (done)' : ''}`"
          :aria-current="i === index ? 'page' : undefined"
        />
      </nav>
      <p class="meta muted">Exercise {{ index + 1 }} of {{ list.length }} · {{ exercise.minutes }} min</p>
      <h1>{{ exercise.title }}</h1>
      <p class="lead">{{ exercise.summary }}</p>
    </header>

    <FilesPanel v-if="exercise.files" :files="exercise.files" class="side" />

    <div class="content">
      <ol class="steps">
        <li v-for="(step, i) in exercise.steps" :key="i" class="step">
          <span class="num" aria-hidden="true">{{ i + 1 }}</span>
          <div class="step-body">
            <p>{{ step.text }}</p>
            <p v-for="note in step.notes" :key="note.for" class="note">
              <span class="tag">{{ note.for }}</span>
              <span>{{ note.text }}</span>
            </p>
            <CodeBlock v-if="step.code" :code="step.code" :label="step.label" />
          </div>
        </li>
      </ol>

      <!-- Styled like a highlighted line on a printed handout. -->
      <section class="expected" aria-labelledby="expected-title">
        <AppIcon name="eye" />
        <div>
          <h2 id="expected-title">You should see</h2>
          <p>{{ exercise.expected }}</p>
        </div>
      </section>

      <div class="actions">
        <button class="btn swap big" :class="isDone ? 'done' : 'primary'" type="button" :disabled="busy" :aria-pressed="isDone" @click="toggle">
          <span :aria-hidden="isDone"><AppIcon name="check" />Mark as done</span>
          <span :aria-hidden="!isDone"><AppIcon name="check" />Done (press to undo)</span>
        </button>
        <span class="spacer" />
        <RouterLink v-if="prev" :to="`/exercises/${prev.id}`" class="btn ghost"><AppIcon name="arrow-left" />Previous</RouterLink>
        <RouterLink v-if="next" :to="`/exercises/${next.id}`" class="btn" :class="{ primary: isDone }">Next<AppIcon name="arrow-right" /></RouterLink>
        <RouterLink v-else to="/quiz" class="btn" :class="{ primary: isDone }">Take the quiz<AppIcon name="arrow-right" /></RouterLink>
      </div>
      <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>
    </div>
  </article>
</template>

<style scoped>
.layout { display: grid; gap: var(--space-5); grid-template-columns: minmax(0, var(--content)); }
/* Wide screens: files panel on the right, sticky while the steps scroll.
   The steps column is the same width with or without the panel. */
@media (min-width: 900px) {
  .layout.has-files { grid-template-columns: minmax(0, var(--content)) 300px; column-gap: var(--space-6); align-items: start; }
  .intro { grid-column: 1; }
  .content { grid-column: 1; }
  /* 120px at the bottom leaves room for the pet. */
  .side { grid-column: 2; grid-row: 1 / span 2; position: sticky; top: 6rem; max-height: calc(100vh - 7.5rem - 120px); overflow-y: auto; }
}

.back {
  display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-sm); font-weight: 600;
  color: var(--muted); text-decoration: none;
}
.back:hover { color: var(--ink); }
.back svg { width: 1rem; height: 1rem; }

.stepper { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: var(--space-1); margin: var(--space-5) 0 var(--space-3); max-width: 420px; }
.seg { display: block; height: 8px; border-radius: 999px; background: var(--panel-2); transition: background-color var(--dur-fast) var(--ease-out); }
.seg:hover { background: var(--border-strong); }
.seg.done { background: var(--primary); }
/* Current exercise: highlighter yellow with an ink outline, so it holds 3:1 on white. */
.seg.current { background: var(--highlight); box-shadow: 0 0 0 1.5px var(--ink); }
.meta { font-size: var(--text-sm); font-weight: 600; margin-bottom: var(--space-1); }
.intro h1 { margin-bottom: var(--space-2); }

/* minmax(0, 1fr): without it the column grows to the longest code line and overflows into the panel. */
.content { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); }
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); }
.step { display: grid; grid-template-columns: 2rem minmax(0, 1fr); gap: var(--space-3); }
.num {
  width: 2rem; height: 2rem; border-radius: 50%; display: grid; place-items: center;
  font-size: var(--text-sm); font-weight: 750; color: var(--primary); background: var(--primary-soft);
}
.step-body { display: grid; gap: var(--space-2); min-width: 0; padding-top: 0.2rem; }
.step-body p { margin: 0; max-width: 68ch; }
.note { display: flex; gap: var(--space-2); align-items: baseline; font-size: var(--text-sm); color: var(--muted); }
.note .tag { flex: none; }

.expected {
  display: flex; gap: var(--space-3); align-items: flex-start;
  padding: var(--space-4) var(--space-5); border-radius: var(--radius-md);
  background: var(--highlight-soft); color: var(--ink);
}
.expected > svg { flex: none; width: 1.4rem; height: 1.4rem; margin-top: 0.1rem; }
.expected h2 { font-size: var(--text-md); margin-bottom: var(--space-1); }
.expected p { margin: 0; }

.actions { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; padding-top: var(--space-5); border-top: 1px solid var(--border); }
.btn.big { min-height: 2.75rem; padding: 0 var(--space-5); font-size: var(--text-md); }
.spacer { flex: 1; }
</style>
