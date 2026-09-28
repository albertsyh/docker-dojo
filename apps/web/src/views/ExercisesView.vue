<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../components/AppIcon.vue'
import JoinGate from '../components/JoinGate.vue'
import JourneyList from '../components/JourneyList.vue'
import { completed, coreCompleted, state, totalMinutes } from '../store'
import type { TakeHomeTrack } from '../api'

const { t } = useI18n()

const doneIn = (track: TakeHomeTrack) => track.exercises.filter((e) => completed.value.has(e.id)).length
const minutesIn = (track: TakeHomeTrack) => track.exercises.reduce((sum, e) => sum + e.minutes, 0)
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="state.content" class="page">
    <header>
      <h1>{{ t('exercises.title') }}</h1>
      <p class="lead">
        {{ t('exercises.lead', { done: coreCompleted.size, total: state.content.exercises.length, minutes: totalMinutes }) }}
      </p>
    </header>

    <JourneyList :exercises="state.content.exercises" :quiz="state.content.quiz" :quiz-progress="state.progress.quiz" quiz-to="/quiz" />

    <section v-if="state.content.takeHome.length" class="take-home" aria-labelledby="take-home-title">
      <h2 id="take-home-title">{{ t('exercises.takeHomeTitle') }}</h2>
      <p class="muted intro">{{ t('exercises.takeHomeIntro') }}</p>
      <ul class="tracks">
        <li v-for="track in state.content.takeHome" :key="track.id">
          <RouterLink :to="`/take-home/${track.id}`" class="track">
            <span class="track-head">
              <strong>{{ track.title }}</strong>
              <span class="tag">{{ track.label }}</span>
              <span v-if="doneIn(track) === track.exercises.length" class="tag ok"><AppIcon name="check" />{{ t('common.done') }}</span>
            </span>
            <span class="muted summary">{{ track.summary }}</span>
            <span class="muted meta">
              {{ t('exercises.trackMeta', { count: track.exercises.length, minutes: minutesIn(track), done: doneIn(track) }) }}
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
