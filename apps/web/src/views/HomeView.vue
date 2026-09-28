<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../api'
import AppIcon from '../components/AppIcon.vue'
import { completed, join, leave, nextExercise, resume, state, totalMinutes } from '../store'

const router = useRouter()
const busy = ref(false)
const error = ref('')
const resumeId = ref('')

const TOPICS = ['Containers', 'Images and layers', 'The build cache', '.dockerignore', 'Multi-stage builds', 'Vulnerability scans', 'Volumes', 'Networks', 'Docker Compose']

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
  <div class="home">
    <section class="hero">
      <h1>Learn Docker by doing it.</h1>
      <p class="lead">
        {{ state.content?.exercises.length }} short hands-on exercises, about {{ totalMinutes }} minutes, then a
        {{ state.content?.quiz.questionCount }}-question quiz. Copy each command, run it on your own machine, and tick it off.
      </p>
      <ul class="topics" aria-label="What you will cover">
        <li v-for="t in TOPICS" :key="t">{{ t }}</li>
      </ul>
    </section>

    <!-- Returning student -->
    <section v-if="state.progress" class="start" aria-labelledby="start-title">
      <div class="badge" aria-hidden="true">
        <div class="badge-band">Hello, I'm</div>
        <div class="badge-name">{{ state.progress.id }}</div>
      </div>
      <div class="start-body">
        <h2 id="start-title">Welcome back</h2>
        <p class="muted">
          {{ completed.size }} of {{ state.content?.exercises.length }} exercises done.
          Keep your id if you want to continue on another device.
        </p>
        <div class="row">
          <RouterLink v-if="nextExercise" :to="`/exercises/${nextExercise.id}`" class="btn primary">
            Continue: {{ nextExercise.title }}<AppIcon name="arrow-right" />
          </RouterLink>
          <RouterLink v-else to="/quiz" class="btn primary">Take the quiz<AppIcon name="arrow-right" /></RouterLink>
          <button class="btn ghost" type="button" @click="leave">Start over with a new id</button>
        </div>
      </div>
    </section>

    <!-- New student: pick an id, then start -->
    <section v-else class="start" aria-labelledby="start-title">
      <div class="badge" :class="{ rolling }" aria-live="polite">
        <div class="badge-band">Hello, I'm</div>
        <div class="badge-name">{{ suggested || ' ' }}</div>
      </div>
      <div class="start-body">
        <h2 id="start-title">Get your name badge</h2>
        <p class="muted">No sign-up. This anonymous id saves your progress. Not keen on it? Roll another.</p>
        <div class="row">
          <button class="btn primary" type="button" :disabled="busy || rolling || !suggested" @click="start">
            Start with this id<AppIcon name="arrow-right" />
          </button>
          <button class="btn" type="button" :disabled="busy || rolling" @click="reroll"><AppIcon name="dice" />Roll again</button>
        </div>
        <form class="resume" @submit.prevent="run(() => resume(resumeId))">
          <label for="resume-id" class="muted">Already started on another device?</label>
          <div class="row">
            <input id="resume-id" v-model="resumeId" type="text" placeholder="your-participant-id" autocomplete="off" spellcheck="false" />
            <button class="btn" type="submit" :disabled="busy || !resumeId.trim()">Continue</button>
          </div>
        </form>
      </div>
    </section>

    <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>

    <section class="before" aria-labelledby="before-title">
      <h2 id="before-title">Before you begin</h2>
      <ul class="checklist">
        <li>
          <AppIcon name="check" />
          <span>Docker installed and running: <a href="https://docs.docker.com/get-started/get-docker/" target="_blank" rel="noopener">Docker Desktop</a> on macOS or Windows, Docker Engine on Linux.</span>
        </li>
        <li>
          <AppIcon name="check" />
          <span>A terminal next to this window. Commands work in macOS and Linux terminals and in Windows PowerShell (not Command Prompt).</span>
        </li>
        <li>
          <AppIcon name="check" />
          <span>Curiosity. This page itself runs in four Docker containers, and near the end you'll see how.</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home { display: grid; gap: var(--space-7); }
.hero h1 { font-size: 2.75rem; max-width: 16ch; margin-bottom: var(--space-4); }
.topics { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-4) 0 0; padding: 0; }
.topics li { font-size: var(--text-sm); font-weight: 600; padding: var(--space-1) var(--space-3); border: 1px solid var(--border); border-radius: 999px; color: var(--ink); }

.start {
  display: grid; grid-template-columns: auto 1fr; gap: var(--space-6); align-items: center;
  padding: var(--space-6); border-radius: var(--radius-lg); background: var(--panel);
}
.start-body h2 { margin-bottom: var(--space-1); }
.start-body .row { margin-top: var(--space-4); }

/* The name badge: the one playful object on the page. */
.badge {
  width: 260px; border-radius: var(--radius-lg); overflow: hidden; background: var(--bg);
  border: 2px solid var(--primary); transform: rotate(-2deg);
  box-shadow: 0 6px 16px oklch(0.22 0.02 150 / 0.12);
}
.badge-band { background: var(--primary); color: var(--primary-ink); font-weight: 800; font-size: var(--text-lg); text-align: center; padding: var(--space-2); letter-spacing: 0.01em; }
.badge-name {
  font-family: var(--mono); font-weight: 700; font-size: var(--text-lg); color: var(--ink); text-align: center;
  padding: var(--space-5) var(--space-3); overflow-wrap: anywhere; transition: opacity var(--dur-base) var(--ease-out);
}
.badge.rolling .badge-name { opacity: 0.3; }

.resume { margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--border); }
.resume label { display: block; font-size: var(--text-sm); margin-bottom: var(--space-2); }

.checklist { list-style: none; margin: var(--space-3) 0 0; padding: 0; display: grid; gap: var(--space-3); max-width: 68ch; }
.checklist li { display: flex; gap: var(--space-3); align-items: flex-start; }
.checklist svg { flex: none; width: 1.25rem; height: 1.25rem; color: var(--primary); margin-top: 0.15rem; }

@media (max-width: 720px) {
  .hero h1 { font-size: var(--text-3xl); }
  .start { grid-template-columns: 1fr; justify-items: start; padding: var(--space-5); }
  .badge { width: 100%; max-width: 300px; }
}
</style>
