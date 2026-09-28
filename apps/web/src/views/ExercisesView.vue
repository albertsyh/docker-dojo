<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import JoinGate from '../components/JoinGate.vue'
import { completed, nextExercise, quizMinutes, state, totalMinutes } from '../store'
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="state.content" class="page">
    <header>
      <h1>Exercises</h1>
      <p class="lead">
        {{ completed.size }} of {{ state.content.exercises.length }} done · about {{ totalMinutes }} minutes in total.
        Work top to bottom: later exercises build on earlier ones.
      </p>
    </header>

    <!-- The course is a real sequence, so it is shown as one numbered line of stops. -->
    <ol class="journey">
      <li
        v-for="(ex, i) in state.content.exercises"
        :key="ex.id"
        :class="{ done: completed.has(ex.id), here: nextExercise?.id === ex.id }"
      >
        <span class="node" aria-hidden="true">
          <AppIcon v-if="completed.has(ex.id)" name="check" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <RouterLink :to="`/exercises/${ex.id}`" class="stop">
          <span class="stop-head">
            <strong>{{ ex.title }}</strong>
            <span v-if="nextExercise?.id === ex.id" class="tag here">You are here</span>
            <span v-else-if="completed.has(ex.id)" class="sr-only">(done)</span>
          </span>
          <span class="muted summary">{{ ex.summary }}</span>
        </RouterLink>
        <span class="minutes muted">{{ ex.minutes }} min</span>
      </li>
      <li class="finish" :class="{ done: state.progress.quiz?.passed, here: !nextExercise && !state.progress.quiz?.passed }">
        <span class="node" aria-hidden="true"><AppIcon :name="state.progress.quiz?.passed ? 'check' : 'sparkle'" /></span>
        <RouterLink to="/quiz" class="stop">
          <span class="stop-head">
            <strong>Quiz</strong>
            <span v-if="!nextExercise && !state.progress.quiz?.passed" class="tag here">You are here</span>
          </span>
          <span class="muted summary">
            {{ state.content.quiz.questionCount }} questions, from easy to reading a full compose file. Each retake asks new ones.
            <template v-if="state.progress.quiz"> Best so far: {{ state.progress.quiz.bestScore }}/{{ state.progress.quiz.total }}.</template>
          </span>
        </RouterLink>
        <span class="minutes muted">{{ quizMinutes }} min</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
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
