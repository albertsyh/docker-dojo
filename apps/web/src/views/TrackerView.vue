<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api, type Stats } from '../api'
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

const maxDone = computed(() => Math.max(1, stats.value?.participants ?? 1))
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
</script>

<template>
  <div class="stack">
    <div class="row head">
      <div>
        <h1>Live tracker</h1>
        <p class="muted" style="margin: 0">Everyone taking the Dojo, updated as it happens.</p>
      </div>
      <span class="status" :class="connection">
        <i />{{ connection === 'live' ? 'Live' : connection === 'connecting' ? 'Connecting…' : 'Offline, refreshing every 30s' }}
      </span>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="stats">
      <div class="tiles">
        <div class="card tile">
          <span class="label">Joined</span>
          <span class="value">{{ stats.participants }}</span>
          <span class="muted">{{ stats.activeNow }} active in the last {{ stats.activeWindowMinutes }} min</span>
        </div>
        <div class="card tile">
          <span class="label">Exercise progress</span>
          <span class="value">{{ stats.exerciseCompletionPct }}%</span>
          <span class="muted">{{ stats.finishedAllExercises }} finished every exercise</span>
        </div>
        <div class="card tile">
          <span class="label">Quiz</span>
          <span class="value">{{ stats.quiz.passed }}<small> / {{ stats.quiz.attempted }}</small></span>
          <span class="muted">
            passed / attempted<template v-if="stats.quiz.averageBestPct !== null"> · avg best {{ stats.quiz.averageBestPct }}%</template>
          </span>
        </div>
      </div>

      <div class="card stack">
        <h2>Completion by exercise</h2>
        <p class="muted" style="margin: 0">Share of everyone who joined that has marked each exercise done.</p>
        <div v-for="(ex, i) in stats.exercises" :key="ex.id" class="ex">
          <div class="ex-head">
            <span><span class="muted">{{ i + 1 }}.</span> {{ ex.title }}</span>
            <span class="muted">{{ ex.completed }} · {{ pct(ex.completed, stats.participants) }}%</span>
          </div>
          <div class="bar"><span :style="{ width: `${(ex.completed / maxDone) * 100}%` }" /></div>
        </div>
      </div>
      <p class="muted small">Last update {{ new Date(stats.updatedAt).toLocaleTimeString() }}</p>
    </template>
    <p v-else-if="!error" class="muted">Loading…</p>
  </div>
</template>

<style scoped>
.head { justify-content: space-between; }
.status { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: var(--muted); }
.status i { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
.status.live { color: var(--ok); }
.status.live i { background: var(--ok); box-shadow: 0 0 0 0 var(--ok); animation: pulse 2s infinite; }
.status.offline i { background: var(--bad); }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 60%, transparent); }
  100% { box-shadow: 0 0 0 10px transparent; }
}
@media (prefers-reduced-motion: reduce) { .status.live i { animation: none; } }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.tile { display: flex; flex-direction: column; gap: 2px; }
.label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.value { font-size: 2.6rem; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.value small { font-size: 1.2rem; color: var(--muted); font-weight: 600; }
.tile .muted { font-size: 0.9rem; }
.ex { display: grid; gap: 6px; }
.ex-head { display: flex; justify-content: space-between; gap: 12px; font-size: 0.95rem; }
.ex-head .muted:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }
.small { font-size: 0.85rem; }
</style>
