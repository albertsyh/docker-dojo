<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <ol class="journey">
    <li v-for="(ex, i) in exercises" :key="ex.id" :class="{ done: completed.has(ex.id), here: next?.id === ex.id }">
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
.minutes { font-size: var(--text-sm); font-variant-numeric: tabular-nums; padding-top: var(--space-2); white-space: nowrap; }
</style>
