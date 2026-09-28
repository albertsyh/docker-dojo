<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import JoinGate from '../components/JoinGate.vue'
import JourneyList from '../components/JourneyList.vue'
import { completed, quizRoute, state, takeHomeTrack } from '../store'

const props = defineProps<{ track: string }>()

const current = computed(() => takeHomeTrack(props.track))
const done = computed(() => current.value?.exercises.filter((e) => completed.value.has(e.id)).length ?? 0)
const minutes = computed(() => current.value?.exercises.reduce((sum, e) => sum + e.minutes, 0) ?? 0)
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="state.content && !current" class="callout">
    <AppIcon name="info" />
    <span>That track doesn't exist. <RouterLink to="/exercises">Back to the exercises</RouterLink></span>
  </div>
  <div v-else-if="current" class="page">
    <header>
      <RouterLink to="/exercises" class="back"><AppIcon name="arrow-left" />All exercises</RouterLink>
      <h1>{{ current.title }}</h1>
      <p class="lead">{{ current.summary }}</p>
      <p class="muted">
        {{ done }} of {{ current.exercises.length }} done · about {{ minutes }} minutes. Work top to bottom: each exercise
        changes the same app, and the last one cleans up everything the track made.
      </p>
    </header>

    <JourneyList
      :exercises="current.exercises"
      :quiz="current.quiz"
      :quiz-progress="state.progress.trackQuizzes[current.id] ?? null"
      :quiz-to="quizRoute(current)"
    />
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
header { display: grid; gap: var(--space-2); }
.back {
  display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-sm); font-weight: 600;
  color: var(--muted); text-decoration: none; justify-self: start;
}
.back:hover { color: var(--ink); }
.back svg { width: 1rem; height: 1rem; }
</style>
