<script setup lang="ts">
import JoinGate from '../components/JoinGate.vue'
import { completed, state, totalMinutes } from '../store'
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="state.content" class="stack">
    <div>
      <h1>Exercises</h1>
      <p class="muted">About {{ totalMinutes }} minutes. Work top to bottom. Later exercises build on earlier ones.</p>
      <div class="bar" role="progressbar" :aria-valuenow="completed.size" :aria-valuemax="state.content.exercises.length">
        <span :style="{ width: `${(completed.size / state.content.exercises.length) * 100}%` }" />
      </div>
    </div>

    <ol class="list">
      <li v-for="(ex, i) in state.content.exercises" :key="ex.id">
        <RouterLink :to="`/exercises/${ex.id}`" class="item card" :class="{ done: completed.has(ex.id) }">
          <span class="num">{{ completed.has(ex.id) ? '✓' : i + 1 }}</span>
          <span class="body">
            <strong>{{ ex.title }}</strong>
            <span class="muted">{{ ex.summary }}</span>
          </span>
          <span class="pill">{{ ex.minutes }} min</span>
        </RouterLink>
      </li>
    </ol>

    <div class="card row next">
      <div>
        <strong>Then: the quiz</strong>
        <p class="muted" style="margin: 0">{{ state.content.quiz.questions.length }} questions, ~10 minutes. You can take it any time.</p>
      </div>
      <RouterLink to="/quiz" class="btn" :class="{ primary: completed.size === state.content.exercises.length }">Go to quiz</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.item { display: flex; gap: 14px; align-items: center; padding: 14px 16px; text-decoration: none; color: var(--text); }
.item:hover { border-color: var(--accent); }
.num {
  flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
  font-weight: 700; background: var(--accent-soft); color: var(--accent);
}
.done .num { background: var(--ok-soft); color: var(--ok); }
.body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.body .muted { font-size: 0.92rem; }
.next { justify-content: space-between; }
</style>
