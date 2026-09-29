<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import CodeBlock from '../components/CodeBlock.vue'
import BrowserBlock from '../components/BrowserBlock.vue'
import FilesPanel from '../components/FilesPanel.vue'
import JoinGate from '../components/JoinGate.vue'
import { usePresence } from '../presence'
import { completed, exerciseLabel, quizRoute, setDone, state, trackOf } from '../store'
import { noteFor } from '../i18n'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// embed (/exercises/<id>?embed): the steps only, readable without joining.
const props = defineProps<{ id: string; embed?: boolean }>()

// Stepper, numbering and Previous/Next stay inside the exercise's own track.
const place = computed(() => trackOf(props.id))
const track = computed(() => place.value?.track ?? null)
const list = computed(() => place.value?.list ?? [])
const backTo = computed(() => (track.value ? `/take-home/${track.value.id}` : '/exercises'))
const index = computed(() => list.value.findIndex((e) => e.id === props.id))
const exercise = computed(() => list.value[index.value])
const prev = computed(() => list.value[index.value - 1])
const next = computed(() => list.value[index.value + 1])
const isDone = computed(() => completed.value.has(props.id))
// Earlier exercises whose files this one needs, each with whether the student marked it done.
const requires = computed(() =>
  (exercise.value?.requires ?? []).map((id) => ({ id, label: exerciseLabel(id) ?? id, done: completed.value.has(id) })),
)
const allRequiredDone = computed(() => requires.value.every((r) => r.done))

// Counts you on this exercise on the Live page while the page is open. An embed doesn't count.
usePresence(() => (state.progress && exercise.value && !props.embed ? props.id : null))

// The title block sticks under the site header on roomy screens. Once it is stuck, a divider shows
// where the steps scroll under it; at rest there is none, so the summary follows the title as usual.
const intro = ref<HTMLElement | null>(null)
const stuck = ref(false)
function checkStuck() {
  const el = intro.value
  if (!el) return
  const style = getComputedStyle(el)
  stuck.value = style.position === 'sticky' && window.scrollY > 0 && el.getBoundingClientRect().top <= parseFloat(style.top) + 0.5
}
onMounted(() => {
  window.addEventListener('scroll', checkStuck, { passive: true })
  window.addEventListener('resize', checkStuck)
  checkStuck()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', checkStuck)
  window.removeEventListener('resize', checkStuck)
})

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
  <JoinGate v-if="!state.progress && !embed" />
  <div v-else-if="!exercise" class="callout">
    <AppIcon name="info" />
    <span>{{ t('exercise.missing') }} <RouterLink v-if="!embed" to="/exercises">{{ t('exercise.backToList') }}</RouterLink></span>
  </div>
  <article v-else class="layout" :class="{ 'has-files': exercise.files && !embed }">
    <header v-if="!embed" ref="intro" class="intro" :class="{ stuck }">
      <RouterLink :to="backTo" class="back"><AppIcon name="arrow-left" />{{ track ? track.title : t('common.allExercises') }}</RouterLink>
      <!-- Where you are in the course: one segment per exercise, each a shortcut. -->
      <nav class="stepper" :aria-label="t('exercise.stepper')">
        <RouterLink
          v-for="(ex, i) in list"
          :key="ex.id"
          :to="`/exercises/${ex.id}`"
          class="seg"
          :class="{ done: completed.has(ex.id), current: i === index }"
          :aria-label="t('exercise.stepLabel', { n: i + 1, title: ex.title }) + (completed.has(ex.id) ? ` ${t('common.doneSr')}` : '')"
          :aria-current="i === index ? 'page' : undefined"
        />
      </nav>
      <p class="meta muted">
        <span v-if="track" class="tag">{{ track.label }}</span>
        {{ t('exercise.meta', { n: index + 1, total: list.length, minutes: exercise.minutes }) }}
      </p>
      <h1>{{ exercise.title }}</h1>
    </header>
    <p v-if="!embed" class="lead summary">{{ exercise.summary }}</p>

    <FilesPanel v-if="exercise.files && !embed" :files="exercise.files" class="side" />

    <div class="content">
      <section v-if="requires.length && !embed" class="callout requires" aria-labelledby="requires-title">
        <AppIcon name="info" />
        <div>
          <h2 id="requires-title">{{ t('exercise.requires.title') }}</h2>
          <p>{{ t('exercise.requires.lead') }}<template v-if="!allRequiredDone"> {{ t('exercise.requires.finishFirst') }}</template></p>
          <ul>
            <li v-for="r in requires" :key="r.id">
              <RouterLink :to="`/exercises/${r.id}`">{{ r.label }}</RouterLink>
              <span v-if="r.done" class="tag ok"><AppIcon name="check" />{{ t('common.done') }}</span>
              <span v-else class="tag">{{ t('exercise.requires.notDone') }}</span>
            </li>
          </ul>
        </div>
      </section>

      <ol class="steps">
        <li v-for="(step, i) in exercise.steps" :key="i" class="step">
          <span class="num" aria-hidden="true">{{ i + 1 }}</span>
          <div class="step-body">
            <p>{{ step.text }}</p>
            <p v-for="note in step.notes" :key="note.for" class="note">
              <span class="tag">{{ noteFor(note.for) }}</span>
              <span>{{ note.text }}</span>
            </p>
            <CodeBlock v-if="step.code" :code="step.code" :label="step.label" :diff="step.diff" />
            <BrowserBlock v-if="step.open" :url="step.open" />
          </div>
        </li>
      </ol>

      <!-- Styled like a highlighted line on a printed handout. -->
      <section v-if="!embed" class="expected" aria-labelledby="expected-title">
        <AppIcon name="eye" />
        <div>
          <h2 id="expected-title">{{ t('exercise.expected') }}</h2>
          <p>{{ exercise.expected }}</p>
        </div>
      </section>

      <div v-if="!embed" class="actions">
        <button class="btn swap big" :class="isDone ? 'done' : 'primary'" type="button" :disabled="busy" :aria-pressed="isDone" @click="toggle">
          <span :aria-hidden="isDone"><AppIcon name="check" />{{ t('exercise.markDone') }}</span>
          <span :aria-hidden="!isDone"><AppIcon name="check" />{{ t('exercise.doneUndo') }}</span>
        </button>
        <span class="spacer" />
        <RouterLink v-if="prev" :to="`/exercises/${prev.id}`" class="btn ghost"><AppIcon name="arrow-left" />{{ t('exercise.previous') }}</RouterLink>
        <RouterLink v-if="next" :to="`/exercises/${next.id}`" class="btn" :class="{ primary: isDone }">{{ t('exercise.next') }}<AppIcon name="arrow-right" /></RouterLink>
        <RouterLink v-else :to="quizRoute(track)" class="btn" :class="{ primary: isDone }">{{ t('exercise.takeQuiz') }}<AppIcon name="arrow-right" /></RouterLink>
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
  .intro, .summary { grid-column: 1; }
  .content { grid-column: 1; }
  /* 120px at the bottom leaves room for the pet. */
  .side { grid-column: 2; grid-row: 1 / span 3; position: sticky; top: 6rem; max-height: calc(100vh - 7.5rem - 120px); overflow-y: auto; }
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
.meta { font-size: var(--text-sm); font-weight: 600; margin-bottom: var(--space-1); display: flex; align-items: center; gap: var(--space-2); }
.intro { padding-bottom: var(--space-2); }
.intro h1 { margin-bottom: 0; }
/* Right under the title, as if it were still inside the header. */
.summary { margin: calc(-1 * var(--space-5)) 0 0; }
/* Sticky only where there is room for it: the steps keep most of the screen.
   The padding gives it air under the site header; the margin cancels it at rest. */
@media (min-width: 900px) and (min-height: 640px) {
  .intro {
    position: sticky; top: var(--header-h); z-index: 1; background: var(--bg);
    padding-top: var(--space-4); margin-top: calc(-1 * var(--space-4));
  }
  .intro.stuck { box-shadow: 0 1px 0 var(--border); }
}

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

.requires h2 { font-size: var(--text-md); margin-bottom: var(--space-1); }
.requires p { margin: 0 0 var(--space-2); max-width: 68ch; }
.requires ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
.requires li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.requires .tag svg { width: 0.9rem; height: 0.9rem; }

.actions { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; padding-top: var(--space-5); border-top: 1px solid var(--border); }
.btn.big { min-height: 2.75rem; padding: 0 var(--space-5); font-size: var(--text-md); }
.spacer { flex: 1; }
</style>
