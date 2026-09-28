<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../api'
import { join, leave, resume, state, totalMinutes } from '../store'

const router = useRouter()
const busy = ref(false)
const error = ref('')
const resumeId = ref('')

// A suggested id is only shown, never saved, until the student presses Start,
// so rerolling doesn't inflate the tracker's "joined" count.
const suggested = ref('')
const rolling = ref(false)

async function reroll() {
  rolling.value = true
  try {
    suggested.value = (await api.suggestId()).id
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    rolling.value = false
  }
}

// Fetch a suggestion whenever the start card is showing (first visit, or after "start over").
watch(
  () => state.progress,
  (progress) => {
    if (!progress && !suggested.value) reroll()
  },
  { immediate: true },
)

async function start() {
  busy.value = true
  error.value = ''
  try {
    await join(suggested.value)
    suggested.value = ''
    router.push('/exercises')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      await reroll()
      error.value = 'Someone grabbed that id a moment ago, so here is a fresh one. Press Start again.'
    } else {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    busy.value = false
  }
}

async function run(fn: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await fn()
    router.push('/exercises')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="stack">
    <section class="hero">
      <h1>Learn Docker by doing it.</h1>
      <p class="lead muted">
        {{ state.content?.exercises.length }} short hands-on exercises (about {{ totalMinutes }} minutes) covering containers, images,
        volumes, networks and Docker Compose. Then a {{ state.content?.quiz.questions.length }}-question quiz to check it stuck.
        Copy each command, run it on your own machine, and mark it done.
      </p>
    </section>

    <div v-if="state.progress" class="card stack">
      <h2>Welcome back</h2>
      <p>You're participating as <code>{{ state.progress.id }}</code>. Keep this id if you want to continue on another device.</p>
      <div class="row">
        <RouterLink to="/exercises" class="btn primary">Continue exercises</RouterLink>
        <button class="btn" type="button" @click="leave">Start over with a new id</button>
      </div>
    </div>

    <template v-else>
      <div class="card stack">
        <h2>Start</h2>
        <p class="muted">No sign-up. This anonymous id saves your progress. Don't like it? Roll another.</p>
        <div class="id-box" aria-live="polite">
          <span class="id" :class="{ dim: rolling }">{{ suggested || '\u00a0' }}</span>
        </div>
        <div class="row">
          <button class="btn primary" type="button" :disabled="busy || rolling || !suggested" @click="start">Start with this id</button>
          <button class="btn" type="button" :disabled="busy || rolling" @click="reroll">🎲 Reroll</button>
        </div>
        <p class="muted small">Note it down if you want to continue on another device later.</p>
      </div>
      <form class="card stack" @submit.prevent="run(() => resume(resumeId))">
        <h2>Already started?</h2>
        <div class="row">
          <input v-model="resumeId" type="text" placeholder="your-participant-id" aria-label="Participant id" autocomplete="off" spellcheck="false" />
          <button class="btn" type="submit" :disabled="busy || !resumeId.trim()">Continue</button>
        </div>
      </form>
    </template>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="card stack">
      <h2>Before you begin</h2>
      <p>You need Docker installed and running: <a href="https://docs.docker.com/get-started/get-docker/" target="_blank" rel="noopener">Docker Desktop</a> on macOS/Windows, or Docker Engine on Linux. Commands work as-is in a macOS or Linux terminal and in Windows PowerShell (not the old Command Prompt). Where a platform needs something different, the step says so.</p>
      <p class="muted">This page itself runs in four Docker containers. You'll see how near the end.</p>
    </div>
  </div>
</template>

<style scoped>
.hero { padding: 12px 0 8px; }
.lead { font-size: 1.1rem; max-width: 62ch; }
.id-box { background: var(--surface-2); border: 1px dashed var(--border); border-radius: 10px; padding: 14px 16px; }
.id { font-family: var(--mono); font-size: clamp(1.1rem, 4vw, 1.5rem); font-weight: 700; color: var(--accent); overflow-wrap: anywhere; transition: opacity 0.15s; }
.id.dim { opacity: 0.4; }
.small { font-size: 0.88rem; margin: 0; }
</style>
