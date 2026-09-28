<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../api'
import AppIcon from '../components/AppIcon.vue'
import { copyId } from '../clipboard'
import { coreCompleted, join, leave, nextExercise, resume, state, totalMinutes } from '../store'
import { useI18n } from 'vue-i18n'

const { t, tm, rt } = useI18n()

const router = useRouter()
const busy = ref(false)
const error = ref('')
const resumeId = ref('')

const topics = computed(() => (tm('home.topics') as unknown as Parameters<typeof rt>[0][]).map((m) => rt(m)))

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
      error.value = t('home.idTaken')
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
      <h1>{{ t('home.title') }}</h1>
      <p class="lead">
        {{ t('home.lead', { count: state.content?.exercises.length ?? 0, minutes: totalMinutes, questions: state.content?.quiz.questionCount ?? 0 }) }}
      </p>
      <ul class="topics" :aria-label="t('home.topicsLabel')">
        <li v-for="topic in topics" :key="topic">{{ topic }}</li>
      </ul>
    </section>

    <!-- Returning student -->
    <section v-if="state.progress" class="start" aria-labelledby="start-title">
      <button type="button" class="badge copyable" :aria-label="t('nav.copyId', { id: state.progress.id })" @click="copyId(state.progress.id)">
        <span class="badge-band">{{ t('home.badgeBand') }}</span>
        <span class="badge-name">{{ state.progress.id }}</span>
        <span class="badge-hint"><AppIcon name="copy" />{{ t('home.clickToCopy') }}</span>
      </button>
      <div class="start-body">
        <h2 id="start-title">{{ t('home.welcomeBack') }}</h2>
        <p class="muted">
          {{ t('home.progress', { done: coreCompleted.size, total: state.content?.exercises.length ?? 0 }) }}
        </p>
        <div class="row">
          <RouterLink v-if="nextExercise" :to="`/exercises/${nextExercise.id}`" class="btn primary">
            {{ t('home.continue', { title: nextExercise.title }) }}<AppIcon name="arrow-right" />
          </RouterLink>
          <RouterLink v-else to="/quiz" class="btn primary">{{ t('home.takeQuiz') }}<AppIcon name="arrow-right" /></RouterLink>
          <button class="btn ghost" type="button" @click="leave">{{ t('home.startOver') }}</button>
        </div>
        <i18n-t v-if="state.content?.takeHome.length" keypath="home.takeHome" tag="p" class="muted take-home" scope="global">
          <template #tracks
            ><template v-for="(track, i) in state.content.takeHome" :key="track.id"
              ><template v-if="i">{{ t('home.or') }}</template><RouterLink :to="`/take-home/${track.id}`">{{ track.label }}</RouterLink></template
            ></template
          >
        </i18n-t>
      </div>
    </section>

    <!-- New student: pick an id, then start -->
    <section v-else class="start" aria-labelledby="start-title">
      <div class="badge" :class="{ rolling }" aria-live="polite">
        <div class="badge-band">{{ t('home.badgeBand') }}</div>
        <div class="badge-name">{{ suggested || ' ' }}</div>
      </div>
      <div class="start-body">
        <h2 id="start-title">{{ t('home.getBadge') }}</h2>
        <p class="muted">{{ t('home.getBadgeText') }}</p>
        <div class="row">
          <button class="btn primary" type="button" :disabled="busy || rolling || !suggested" @click="start">
            {{ t('home.startWithId') }}<AppIcon name="arrow-right" />
          </button>
          <button class="btn" type="button" :disabled="busy || rolling" @click="reroll"><AppIcon name="dice" />{{ t('home.rollAgain') }}</button>
        </div>
        <form class="resume" @submit.prevent="run(() => resume(resumeId))">
          <label for="resume-id" class="muted">{{ t('home.resumeLabel') }}</label>
          <div class="row">
            <input id="resume-id" v-model="resumeId" type="text" :placeholder="t('home.resumePlaceholder')" autocomplete="off" spellcheck="false" />
            <button class="btn" type="submit" :disabled="busy || !resumeId.trim()">{{ t('home.continueButton') }}</button>
          </div>
        </form>
      </div>
    </section>

    <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>

    <section class="before" aria-labelledby="before-title">
      <h2 id="before-title">{{ t('home.before') }}</h2>
      <ul class="checklist">
        <li>
          <AppIcon name="check" />
          <i18n-t keypath="home.checkDocker" tag="span" scope="global">
            <template #desktop><a href="https://docs.docker.com/get-started/get-docker/" target="_blank" rel="noopener">Docker Desktop</a></template>
          </i18n-t>
        </li>
        <li>
          <AppIcon name="check" />
          <span>{{ t('home.checkTerminal') }}</span>
        </li>
        <li>
          <AppIcon name="check" />
          <span>{{ t('home.checkCurious') }}</span>
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
.start-body .take-home { margin: var(--space-3) 0 0; font-size: var(--text-sm); }

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
.badge .badge-band, .badge .badge-name { display: block; }
/* Your own badge is a button: it copies the id, for continuing on another device. */
.badge.copyable { padding: 0; font: inherit; cursor: copy; transition: transform var(--dur-fast) var(--ease-out); }
.badge.copyable:hover { transform: rotate(-1deg) translateY(-2px); }
.badge.copyable:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.badge.copyable .badge-name { padding-bottom: var(--space-2); }
.badge-hint { display: flex; justify-content: center; align-items: center; gap: var(--space-1); padding-bottom: var(--space-3); font-size: var(--text-xs); color: var(--muted); }
.badge-hint svg { width: 0.9rem; height: 0.9rem; }

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
