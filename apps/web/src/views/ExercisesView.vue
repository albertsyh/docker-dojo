<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import JoinGate from '../components/JoinGate.vue'
import JourneyList from '../components/JourneyList.vue'
import { completed, coreCompleted, state, totalMinutes } from '../store'
import type { TakeHomeTrack } from '../api'

const doneIn = (track: TakeHomeTrack) => track.exercises.filter((e) => completed.value.has(e.id)).length
const minutesIn = (track: TakeHomeTrack) => track.exercises.reduce((sum, e) => sum + e.minutes, 0)
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="state.content" class="page">
    <header>
      <h1>Exercises</h1>
      <p class="lead">
        {{ coreCompleted.size }} of {{ state.content.exercises.length }} done · about {{ totalMinutes }} minutes in total.
        Work top to bottom: later exercises build on earlier ones.
      </p>
    </header>

    <JourneyList :exercises="state.content.exercises" :quiz="state.content.quiz" :quiz-progress="state.progress.quiz" quiz-to="/quiz" />

    <section v-if="state.content.takeHome.length" class="take-home" aria-labelledby="take-home-title">
      <h2 id="take-home-title">Take-home tracks</h2>
      <p class="muted intro">
        For after the workshop, at your own pace. Each track uses one app from start to finish, covers the mistakes that
        only show up later, and ends with its own quiz. Pick the stack you work in.
      </p>
      <ul class="tracks">
        <li v-for="track in state.content.takeHome" :key="track.id">
          <RouterLink :to="`/take-home/${track.id}`" class="track">
            <span class="track-head">
              <strong>{{ track.title }}</strong>
              <span class="tag">{{ track.label }}</span>
              <span v-if="doneIn(track) === track.exercises.length" class="tag ok"><AppIcon name="check" />Done</span>
            </span>
            <span class="muted summary">{{ track.summary }}</span>
            <span class="muted meta">
              {{ track.exercises.length }} exercises · about {{ minutesIn(track) }} minutes · {{ doneIn(track) }} of {{ track.exercises.length }} done
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
.take-home { display: grid; gap: var(--space-3); padding-top: var(--space-5); border-top: 1px solid var(--border); }
.intro { max-width: 62ch; }
.tracks { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
.track {
  display: grid; gap: 2px; padding: var(--space-3); margin: 0 calc(var(--space-3) * -1);
  border-radius: var(--radius-md); color: var(--ink); text-decoration: none;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.track:hover { background: var(--panel); }
.track-head { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; font-size: var(--text-lg); }
.summary { font-size: var(--text-sm); max-width: 62ch; }
.meta { font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
</style>
