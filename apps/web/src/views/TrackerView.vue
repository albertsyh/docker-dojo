<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, type Stats } from '../api'
import AppIcon from '../components/AppIcon.vue'
import ExerciseLadder from '../components/ExerciseLadder.vue'
import { getEcho } from '../realtime'
import { routeParam } from '../routeParams'
import { state } from '../store'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// /live?embed: exercise progress only, for an iframe on the session's own site. App.vue drops the chrome.
const route = useRoute()
const embed = computed(() => route.query.embed !== undefined)

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

// Embedded, the page scales to fill its frame. An iframe comes in any shape, so it lays the
// content out at a range of widths and keeps the one that fills the frame best when scaled up.
// Too tall even at the smallest scale, it scrolls rather than shrinking past readable.
const MIN_WIDTH = 640
const MAX_WIDTH = 1100
const MIN_SCALE = 0.75
const frame = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const fit = ref({ width: 0, height: 0, scale: 1 })
function refit() {
  const box = frame.value
  const el = stage.value
  if (!embed.value || !box || !el) return
  const vw = box.clientWidth
  const vh = document.documentElement.clientHeight
  let best = { width: MIN_WIDTH, height: 0, scale: 0 }
  for (let w = Math.min(MIN_WIDTH, vw); w <= Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, vw)); w += 40) {
    el.style.width = `${w}px`
    const h = el.offsetHeight
    const scale = Math.min(vw / w, vh / h)
    if (scale > best.scale) best = { width: w, height: h, scale }
  }
  // Vue only patches the width when its own value changes, so put the winner back by hand.
  el.style.width = `${best.width}px`
  fit.value = { ...best, scale: Math.max(MIN_SCALE, best.scale) }
}
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!embed.value || !stage.value) return
  observer = new ResizeObserver(() => refit())
  observer.observe(stage.value)
  window.addEventListener('resize', refit)
  refit()
})
const sizerStyle = computed(() => (embed.value && fit.value.height ? { width: `${fit.value.width * fit.value.scale}px`, height: `${fit.value.height * fit.value.scale}px` } : undefined))
const stageStyle = computed(() => (embed.value && fit.value.height ? { width: `${fit.value.width}px`, transform: `scale(${fit.value.scale})` } : undefined))

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', refit)
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
// ?exercise=<id>&count=N: just the named exercise and its neighbours (N in all, default 3),
// for showing the part of the course the room is on. Numbers keep their place in the full list.
// Both may also come after the # (/live?embed#exercise=<id>), see routeParams.ts.
const param = (name: string) => routeParam(route, name)
const focusId = computed(() => param('exercise'))
// A take-home exercise in ?exercise swaps the list for that track's own.
const focusTrack = computed(() => stats.value?.takeHome.find((t) => t.exercises.some((e) => e.id === focusId.value)) ?? null)
// The stats are one broadcast for everyone, so their titles are English. Show each viewer's own
// language instead, from the content they loaded, by id.
const titles = computed(() => {
  const c = state.content
  const all = [...(c?.exercises ?? []), ...(c?.takeHome.flatMap((track) => track.exercises) ?? [])]
  return new Map([...all.map((e) => [e.id, e.title] as const), ...(c?.takeHome.map((track) => [track.id, track.title] as const) ?? [])])
})
const titled = <T extends { id: string; title: string }>(item: T): T => ({ ...item, title: titles.value.get(item.id) ?? item.title })
const numbered = <T extends { id: string; title: string }>(list: T[]) => list.map((ex, i) => ({ ...titled(ex), n: i + 1 }))
const rows = computed(() => {
  const all = numbered(focusTrack.value?.exercises ?? stats.value?.exercises ?? [])
  const at = all.findIndex((ex) => ex.id === focusId.value)
  if (at < 0) return { list: all, total: all.length, focused: false }
  const count = Math.min(all.length, Math.max(1, Number.parseInt(param('count') ?? '3', 10) || 3))
  // Centred on the named exercise, shifted inwards at either end so there are always `count`.
  const start = Math.min(Math.max(0, at - Math.floor((count - 1) / 2)), all.length - count)
  return { list: all.slice(start, start + count), total: all.length, focused: true }
})
const anyDone = computed(() => stats.value?.exercises.some((e) => e.completed > 0) ?? false)
const width = (n: number) => `${pct(n, stats.value?.participants ?? 0)}%`
</script>

<template>
  <div ref="frame" class="wide-page" :class="{ fit: embed }">
  <div class="sizer" :style="sizerStyle">
  <div ref="stage" class="tracker" :style="stageStyle">
    <header class="head">
      <h1 v-if="!embed">{{ t('live.title') }}</h1>
      <span class="status" :class="connection" role="status">
        <i aria-hidden="true" />{{ t(`live.status.${connection}`) }}
      </span>
    </header>

    <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>

    <template v-if="stats">
      <!-- Written as sentences so the room can read it from the back. -->
      <i18n-t keypath="live.headline" tag="p" class="headline" aria-live="polite" scope="global">
        <template #participants><strong>{{ stats.participants }}</strong></template>
        <template #active><strong>{{ stats.activeNow }}</strong></template>
        <template #minutes>{{ stats.activeWindowMinutes }}</template>
      </i18n-t>

      <div v-if="!stats.participants" class="callout">
        <AppIcon name="info" />
        <i18n-t keypath="live.nobody" tag="span" scope="global">
          <template #url><strong>{{ origin }}</strong></template>
        </i18n-t>
      </div>

      <div v-else class="grid" :class="{ solo: embed }">
        <section aria-labelledby="ex-title">
          <h2 id="ex-title">{{ focusTrack ? titled(focusTrack).title : t('live.exercises') }}</h2>
          <p v-if="focusTrack" class="muted sub">{{ t('live.takeHomeSub') }}</p>
          <p v-else-if="anyDone" class="muted sub">
            {{ t('live.progress', { pct: stats.exerciseCompletionPct, finished: t('live.finished', stats.finishedAllExercises) }) }}
          </p>
          <p v-else class="muted sub empty">{{ t('live.empty') }}</p>
          <p v-if="rows.focused" class="muted sub">{{ t('live.showing', { from: rows.list[0].n, to: rows.list[rows.list.length - 1].n, total: rows.total }) }}</p>
          <p v-else-if="focusId" class="muted sub">{{ t('live.unknown', { id: focusId }) }}</p>
          <ExerciseLadder
            :rows="rows.list"
            :participants="stats.participants"
            :here-window-minutes="stats.hereWindowMinutes"
            :current="rows.focused ? focusId : null"
            :quiet="focusTrack ? !focusTrack.exercises.some((e) => e.completed > 0) : !anyDone"
          />
          <p class="muted small note">{{ t('live.hereNote', { minutes: stats.hereWindowMinutes }) }}</p>
        </section>

        <section v-if="!embed" aria-labelledby="quiz-title" class="quiz">
          <h2 id="quiz-title">{{ t('live.quiz') }}</h2>
          <i18n-t v-if="quizGroups" keypath="live.quizLine" tag="p" class="quiz-line" scope="global">
            <template #passed><strong>{{ quizGroups.passed }}</strong></template>
            <template #trying><strong>{{ quizGroups.tryingAgain }}</strong></template>
            <template #taking><strong>{{ quizGroups.takingNow }}</strong></template>
            <template #notStarted><strong>{{ quizGroups.notStarted }}</strong></template>
          </i18n-t>
          <div v-if="quizGroups" class="stacked" aria-hidden="true">
            <span class="passed" :style="{ width: width(quizGroups.passed) }" />
            <span class="tried" :style="{ width: width(quizGroups.tryingAgain) }" />
            <span class="taking" :style="{ width: width(quizGroups.takingNow) }" />
          </div>
          <ul class="legend">
            <li><i class="passed" />{{ t('live.legendPassed') }}</li>
            <li><i class="tried" />{{ t('live.legendTried') }}</li>
            <li><i class="taking" />{{ t('live.legendTaking', { minutes: stats.activeWindowMinutes }) }}</li>
            <li><i class="not-yet" />{{ t('live.legendNotYet') }}</li>
          </ul>
          <p v-if="stats.quiz.averageBestPct !== null" class="muted">{{ t('live.average', { pct: stats.quiz.averageBestPct }) }}</p>
        </section>
      </div>

      <!-- Self-paced tracks: their own lists, never part of the workshop's figures above. -->
      <section v-if="!embed && stats.participants && stats.takeHome.length" class="take-home" aria-labelledby="take-home-title">
        <h2 id="take-home-title">{{ t('live.takeHome') }}</h2>
        <p class="muted sub">{{ t('live.takeHomeIntro') }}</p>
        <div v-for="track in stats.takeHome" :key="track.id" class="take-home-track">
          <h3>{{ titled(track).title }} <span class="tag">{{ track.label }}</span></h3>
          <ExerciseLadder
            :rows="numbered(track.exercises)"
            :participants="stats.participants"
            :here-window-minutes="stats.hereWindowMinutes"
            :quiet="!track.exercises.some((e) => e.completed > 0)"
          />
        </div>
      </section>
      <p class="muted small">{{ t('live.lastUpdate', { time: new Date(stats.updatedAt).toLocaleTimeString(locale) }) }}</p>
    </template>
    <p v-else-if="!error" class="muted">{{ t('common.loading') }}</p>
  </div>
  </div>
  </div>
</template>

<style scoped>
.tracker { display: grid; gap: var(--space-6); }
/* Embedded: the stage is laid out at a fixed width, then scaled from its corner into a sizer
   that reserves the scaled size, centred in the frame. */
.fit { min-height: 100dvh; display: grid; place-items: center; overflow-x: hidden; }
.fit .tracker { padding: var(--space-5); transform-origin: 0 0; }
.fit .headline { font-size: var(--text-3xl); }
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
.grid.solo { grid-template-columns: 1fr; }
h2 { font-size: var(--text-xl); margin-bottom: var(--space-1); }
.sub { margin-bottom: var(--space-4); }

.sub.empty { max-width: 48ch; }
.note { margin-top: var(--space-4); }

.take-home { display: grid; gap: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--border); }
.take-home .sub { margin: 0; }
.take-home-track { display: grid; gap: var(--space-3); }
.take-home-track h3 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-lg); margin: 0; }

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
