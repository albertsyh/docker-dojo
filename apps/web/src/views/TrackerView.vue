<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api, type Stats } from '../api'
import AppIcon from '../components/AppIcon.vue'
import { getEcho } from '../realtime'
import { state } from '../store'

const stats = ref<Stats | null>(null)
const connection = ref<'connecting' | 'live' | 'offline'>('connecting')
const error = ref('')
let refreshTimer: number | undefined
let unbind: (() => void) | undefined

// Reverb pushes a fresh snapshot on every join / exercise / quiz submission.
// The periodic refresh only exists so "active now" decays while nobody is clicking.
async function refresh() {
  try {
    stats.value = await api.stats()
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => {
  refresh()
  refreshTimer = window.setInterval(refresh, 30_000)

  const key = state.content?.realtime.key
  if (!key) {
    connection.value = 'offline'
    return
  }
  const echo = getEcho(key)
  echo.channel('tracker').listen('.stats.updated', (s: Stats) => (stats.value = s))

  const conn = echo.connector.pusher.connection
  const onState = ({ current }: { current: string }) => {
    connection.value = current === 'connected' ? 'live' : current === 'connecting' || current === 'initialized' ? 'connecting' : 'offline'
  }
  onState({ current: conn.state })
  conn.bind('state_change', onState)
  unbind = () => conn.unbind('state_change', onState)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  unbind?.()
  state.content?.realtime.key && getEcho(state.content.realtime.key).leaveChannel('tracker')
})

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
const origin = location.origin

// Quiz as one stacked bar across everyone who joined. Every participant is in exactly one group.
const quizGroups = computed(() => {
  const s = stats.value
  if (!s) return null
  const passed = s.quiz.passed
  const tryingAgain = s.quiz.attempted - s.quiz.passed
  const takingNow = s.quiz.takingNow
  const notStarted = Math.max(0, s.participants - passed - tryingAgain - takingNow)
  return { passed, tryingAgain, takingNow, notStarted }
})
const width = (n: number) => `${pct(n, stats.value?.participants ?? 0)}%`
</script>

<template>
  <div class="tracker wide-page">
    <header class="head">
      <h1>Live</h1>
      <span class="status" :class="connection" role="status">
        <i aria-hidden="true" />{{ connection === 'live' ? 'Live' : connection === 'connecting' ? 'Connecting…' : 'Offline, refreshing every 30s' }}
      </span>
    </header>

    <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>

    <template v-if="stats">
      <!-- Written as sentences so the room can read it from the back. -->
      <p class="headline" aria-live="polite">
        <strong>{{ stats.participants }}</strong> in the room.
        <strong>{{ stats.activeNow }}</strong> active in the last {{ stats.activeWindowMinutes }} minutes.
      </p>

      <div v-if="!stats.participants" class="callout">
        <AppIcon name="info" />
        <span>Nobody has joined yet. Ask everyone to open <strong>{{ origin }}</strong> and get their name badge.</span>
      </div>

      <div v-else class="grid">
        <section aria-labelledby="ex-title">
          <h2 id="ex-title">Exercises</h2>
          <p class="muted sub">
            {{ stats.exerciseCompletionPct }}% of all exercises done · {{ stats.finishedAllExercises }}
            {{ stats.finishedAllExercises === 1 ? 'person has' : 'people have' }} finished every one
          </p>
          <ol class="ladder">
            <li v-for="(ex, i) in stats.exercises" :key="ex.id">
              <span class="ex-name"><span class="muted">{{ i + 1 }}</span>{{ ex.title }}</span>
              <span class="track" aria-hidden="true"><span :style="{ transform: `scaleX(${pct(ex.completed, stats.participants) / 100})` }" /></span>
              <span class="ex-count">{{ ex.completed }}<span class="muted"> · {{ pct(ex.completed, stats.participants) }}%</span></span>
            </li>
          </ol>
        </section>

        <section aria-labelledby="quiz-title" class="quiz">
          <h2 id="quiz-title">Quiz</h2>
          <p v-if="quizGroups" class="quiz-line">
            <strong>{{ quizGroups.passed }}</strong> passed,
            <strong>{{ quizGroups.tryingAgain }}</strong> trying again,
            <strong>{{ quizGroups.takingNow }}</strong> taking it now,
            <strong>{{ quizGroups.notStarted }}</strong> not started.
          </p>
          <div v-if="quizGroups" class="stacked" aria-hidden="true">
            <span class="passed" :style="{ width: width(quizGroups.passed) }" />
            <span class="tried" :style="{ width: width(quizGroups.tryingAgain) }" />
            <span class="taking" :style="{ width: width(quizGroups.takingNow) }" />
          </div>
          <ul class="legend">
            <li><i class="passed" />Passed</li>
            <li><i class="tried" />Submitted, not passed yet</li>
            <li><i class="taking" />Taking it now (active in the last {{ stats.activeWindowMinutes }} min)</li>
            <li><i class="not-yet" />Not started</li>
          </ul>
          <p v-if="stats.quiz.averageBestPct !== null" class="muted">Average best score: {{ stats.quiz.averageBestPct }}%</p>
        </section>
      </div>
      <p class="muted small">Last update {{ new Date(stats.updatedAt).toLocaleTimeString() }}</p>
    </template>
    <p v-else-if="!error" class="muted">Loading…</p>
  </div>
</template>

<style scoped>
.tracker { display: grid; gap: var(--space-6); }
.head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
.head h1 { margin: 0; }
.status { display: inline-flex; align-items: center; gap: var(--space-2); font-weight: 650; font-size: var(--text-sm); color: var(--muted); padding: var(--space-1) var(--space-3); border-radius: 999px; background: var(--panel); }
.status i { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
.status.live { color: var(--primary); background: var(--primary-soft); }
.status.live i { background: var(--primary); animation: pulse 2s var(--ease-out) infinite; }
.status.offline { color: var(--error); background: var(--error-soft); }
.status.offline i { background: var(--error); }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary) 60%, transparent); }
  100% { box-shadow: 0 0 0 10px transparent; }
}

.headline { font-size: clamp(1.75rem, 3.6vw, 3rem); font-weight: 650; line-height: 1.2; letter-spacing: -0.02em; margin: 0; max-width: 28ch; text-wrap: balance; }
.headline strong { color: var(--primary); font-weight: 800; font-variant-numeric: tabular-nums; }

.grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--space-7); align-items: start; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
h2 { font-size: var(--text-xl); margin-bottom: var(--space-1); }
.sub { margin-bottom: var(--space-4); }

.ladder { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.ladder li { display: grid; grid-template-columns: minmax(0, 15rem) minmax(0, 1fr) 6.5rem; gap: var(--space-4); align-items: center; font-size: var(--text-lg); }
.ex-name { display: flex; gap: var(--space-2); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex-name .muted { font-variant-numeric: tabular-nums; min-width: 1.4em; }
.track { height: 14px; border-radius: 999px; background: var(--panel-2); overflow: hidden; }
.track > span { display: block; height: 100%; background: var(--primary); transform-origin: left; transition: transform var(--dur-slow) var(--ease-out); }
.ex-count { font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
@media (max-width: 640px) {
  .ladder li { grid-template-columns: 1fr auto; font-size: var(--text-md); }
  .track { grid-column: 1 / -1; grid-row: 2; }
}

.quiz { display: grid; gap: var(--space-3); }
.quiz-line { font-size: var(--text-lg); margin: 0; }
.quiz-line strong { font-variant-numeric: tabular-nums; }
.stacked { display: flex; height: 20px; border-radius: 999px; overflow: hidden; background: var(--panel-2); }
.stacked span { display: block; height: 100%; }
.passed { background: var(--primary); }
.tried { background: var(--highlight); }
/* In progress: stripes of the "done" green, so it reads as on its way there. */
.taking { background: repeating-linear-gradient(135deg, var(--primary) 0 4px, var(--primary-soft) 4px 8px); }
.legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); font-size: var(--text-sm); }
.legend li { display: inline-flex; align-items: center; gap: var(--space-2); }
.legend i { width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--border-strong); }
.legend i.not-yet { background: var(--panel-2); }
.small { font-size: var(--text-sm); margin: 0; }
</style>
