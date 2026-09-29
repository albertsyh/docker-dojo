<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Exercise, QuizProgress, QuizSummary } from '../api'
import { completed } from '../store'
import AppIcon from './AppIcon.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// A track is a real sequence, so it is shown as one numbered line of stops, ending in its quiz.
const props = defineProps<{
  exercises: Exercise[]
  quiz: QuizSummary
  quizProgress: QuizProgress | null
  /** Where the quiz stop links to. */
  quizTo: string
}>()

const next = computed(() => props.exercises.find((e) => !completed.value.has(e.id)) ?? null)
const quizHere = computed(() => !next.value && !props.quizProgress?.passed)

// The unbroken run of done exercises at the top folds into one row, so the list opens near where
// you are. A stop done out of order stays in its place. Folded until the student opens it once.
const FOLD_AT = 3
const MAX_TICKS = 3
const OPEN_KEY = 'docker-dojo:journey-open'
const doneRun = computed(() => {
  const i = props.exercises.findIndex((e) => !completed.value.has(e.id))
  return i === -1 ? props.exercises.length : i
})
const foldable = computed(() => doneRun.value >= FOLD_AT)
const open = ref(readOpen())
const folded = computed(() => foldable.value && !open.value)
const ticks = computed(() => Math.min(doneRun.value, MAX_TICKS))

function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(OPEN_KEY, open.value ? '1' : '0')
  } catch {
    /* private mode: it just won't be remembered */
  }
}
</script>

<template>
  <ol class="journey">
    <li v-if="foldable" class="fold done" :class="{ open }">
      <button type="button" class="fold-toggle" :aria-expanded="open" @click="toggle">
        <span class="fold-start">
          <span class="stack" aria-hidden="true">
            <span v-for="n in ticks" :key="n" class="node"><AppIcon name="check" /></span>
            <span v-if="doneRun > ticks" class="more">+{{ doneRun - ticks }}</span>
          </span>
          <span class="fold-label">{{ t('journey.doneRun', { n: doneRun }) }}</span>
        </span>
        <AppIcon name="chevron-down" class="chevron" />
      </button>
    </li>
    <template v-for="(ex, i) in exercises" :key="ex.id">
      <li v-if="!(folded && i < doneRun)" :class="{ done: completed.has(ex.id), here: next?.id === ex.id }">
        <span class="node" aria-hidden="true">
          <AppIcon v-if="completed.has(ex.id)" name="check" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <RouterLink :to="`/exercises/${ex.id}`" class="stop">
          <span class="stop-head">
            <strong>{{ ex.title }}</strong>
            <span v-if="next?.id === ex.id" class="tag here">{{ t('common.youAreHere') }}</span>
            <span v-else-if="completed.has(ex.id)" class="sr-only">{{ t('common.doneSr') }}</span>
          </span>
          <span class="muted summary">{{ ex.summary }}</span>
        </RouterLink>
        <span class="minutes muted">{{ t('common.minutes', { n: ex.minutes }) }}</span>
      </li>
    </template>
    <li class="finish" :class="{ done: quizProgress?.passed, here: quizHere }">
      <span class="node" aria-hidden="true"><AppIcon :name="quizProgress?.passed ? 'check' : 'sparkle'" /></span>
      <RouterLink :to="quizTo" class="stop">
        <span class="stop-head">
          <strong>{{ t('journey.quiz') }}</strong>
          <span v-if="quizHere" class="tag here">{{ t('common.youAreHere') }}</span>
        </span>
        <span class="muted summary">
          {{ t('journey.quizSummary', { count: quiz.questionCount }) }}
          <template v-if="quizProgress">{{ ' ' + t('journey.best', { score: quizProgress.bestScore, total: quizProgress.total }) }}</template>
        </span>
      </RouterLink>
      <span class="minutes muted">{{ t('common.minutes', { n: quiz.minutes }) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.journey { list-style: none; margin: 0; padding: 0; }
.journey li {
  position: relative; display: grid; grid-template-columns: 2.5rem 1fr auto; gap: var(--space-4); align-items: start;
  padding-bottom: var(--space-2);
}
/* The line joining each stop to the next. */
.journey li:not(:last-child)::before {
  content: ''; position: absolute; left: calc(1.25rem - 1px); top: 2.5rem; bottom: 0; width: 2px; background: var(--border);
}
.journey li.done:not(:last-child)::before { background: var(--primary); }
.node {
  width: 2.5rem; height: 2.5rem; border-radius: 50%; display: grid; place-items: center;
  font-weight: 750; font-variant-numeric: tabular-nums; color: var(--muted);
  background: var(--bg); border: 2px solid var(--border-strong);
}
.node svg { width: 1.2rem; height: 1.2rem; }
.done .node { background: var(--primary); border-color: var(--primary); color: var(--primary-ink); }
.here .node { background: var(--highlight); border-color: var(--ink); color: var(--highlight-ink); }
.stop {
  display: grid; gap: 2px; padding: var(--space-2) var(--space-3); margin: calc(var(--space-1) * -1) 0 var(--space-3);
  border-radius: var(--radius-md); color: var(--ink); text-decoration: none;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.stop:hover { background: var(--panel); }
.stop-head { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; font-size: var(--text-lg); }
.summary { font-size: var(--text-sm); max-width: 60ch; }
/* The folded run: a short stack of ticks where the first stop's node would be, the chevron in the middle. */
.fold-toggle {
  grid-column: 1 / -1; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-3);
  width: 100%; margin: 0 0 var(--space-3); padding: 0 var(--space-3) 0 0; font: inherit; color: var(--ink); text-align: left;
  background: none; border: 0; border-radius: 999px; cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.fold-toggle:hover { background: var(--panel); }
.fold-start { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.stack { display: flex; align-items: center; flex: none; }
/* Each tick overlaps the one before, with a ring of page colour to keep them apart. */
.stack .node + .node { margin-left: -1.6rem; }
.stack .node { box-shadow: 0 0 0 3px var(--bg); }
.more { margin-left: var(--space-2); font-size: var(--text-sm); font-weight: 750; font-variant-numeric: tabular-nums; color: var(--primary); }
.fold-label { font-weight: 650; }
.chevron { width: 1.4rem; height: 1.4rem; color: var(--muted); transition: transform var(--dur-base) var(--ease-out); }
.fold.open .chevron { transform: rotate(180deg); }
.minutes { font-size: var(--text-sm); font-variant-numeric: tabular-nums; padding-top: var(--space-2); white-space: nowrap; }
</style>
