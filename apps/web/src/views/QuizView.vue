<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { api, type Answer, type Level, type Question, type QuizPaper, type QuizResult } from '../api'
import AppIcon from '../components/AppIcon.vue'
import BlankCode from '../components/BlankCode.vue'
import CodeBlock from '../components/CodeBlock.vue'
import JoinGate from '../components/JoinGate.vue'
import RichText from '../components/RichText.vue'
import { petReact } from '../pets'
import { state, takeHomeTrack } from '../store'

/** A take-home track's quiz, or the workshop's when there is none. */
const props = defineProps<{ track?: string }>()
const trackInfo = computed(() => (props.track ? takeHomeTrack(props.track) : null))
const unknownTrack = computed(() => !!props.track && !!state.content && !trackInfo.value)
const summary = computed(() => (props.track ? trackInfo.value?.quiz : state.content?.quiz))
const passPct = computed(() => Math.round((summary.value?.passMark ?? 0) * 100))

const SECTIONS: Record<Level, { title: string; intro: string }> = {
  easy: { title: 'Easy', intro: 'Quick checks. Pick one answer.' },
  medium: { title: 'Medium: fill in the blanks', intro: 'Read the situation, then type what goes in each gap. Capital letters and extra spaces do not matter.' },
  advanced: { title: 'Advanced: read a compose file', intro: 'All of these questions are about the file below. Take a minute to read it first.' },
}

const paper = ref<QuizPaper | null>(null)
const answers = ref<(Answer | null)[]>([])
const result = ref<QuizResult | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')

// A new paper each time: the server picks questions you have seen least.
async function start() {
  if (!state.progress) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    paper.value = await api.quizPaper(state.progress.id, props.track)
    answers.value = paper.value.questions.map((q) => (q.kind === 'blanks' ? Array<string>(q.blanks).fill('') : null))
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
watch([() => state.progress?.id, () => props.track], ([id]) => id && !unknownTrack.value && start(), { immediate: true })

// Answering sends nothing to the server, so check in every 2 minutes while a quiz is open.
// That keeps this student under "taking it now" on the live tracker (a 5-minute window).
const CHECK_IN_MS = 120_000
let checkIn: number | undefined
watch(
  () => !!paper.value && !result.value,
  (open) => {
    clearInterval(checkIn)
    if (open) {
      checkIn = window.setInterval(() => {
        if (state.progress && document.visibilityState === 'visible') api.progress(state.progress.id).catch(() => {})
      }, CHECK_IN_MS)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(checkIn))

const questions = computed(() => paper.value?.questions ?? [])
const sections = computed(() =>
  (['easy', 'medium', 'advanced'] as Level[])
    .map((level) => ({ level, ...SECTIONS[level], items: questions.value.map((q, index) => ({ q, index })).filter(({ q }) => q.level === level) }))
    .filter((s) => s.items.length),
)
const scenarioFor = (q: Question) => (q.kind === 'choice' && q.scenario ? paper.value?.scenarios.find((s) => s.id === q.scenario) : undefined)
// Show each compose file once, above the first question about it.
const showScenario = (index: number) => {
  const here = scenarioFor(questions.value[index])
  return here && (index === 0 || scenarioFor(questions.value[index - 1])?.id !== here.id) ? here : undefined
}

const isAnswered = (a: Answer | null) => (Array.isArray(a) ? a.every((v) => v.trim() !== '') : a !== null)
const answeredCount = computed(() => answers.value.filter(isAnswered).length)
const complete = computed(() => questions.value.length > 0 && answeredCount.value === questions.value.length)

async function submit() {
  if (!state.progress || !paper.value || !complete.value) return
  busy.value = true
  error.value = ''
  try {
    result.value = await api.submitQuiz(state.progress.id, paper.value, answers.value as Answer[], props.track)
    state.progress = result.value.progress
    petReact(result.value.passed ? 'jump' : 'sad')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

const res = (index: number) => result.value?.results[index]
function optionClass(index: number, option: number) {
  const r = res(index)
  if (!r) return { selected: answers.value[index] === option }
  return { correct: option === r.answer, wrong: option === r.chosen && !r.correct, selected: option === r.chosen }
}
/** Blanks the student got wrong, with what was expected. */
function missedBlanks(index: number) {
  const r = res(index)
  if (!r?.blankCorrect || !Array.isArray(r.answer) || !Array.isArray(r.chosen)) return []
  const expected = r.answer
  const given = r.chosen
  return r.blankCorrect.flatMap((ok, i) => (ok ? [] : [{ n: i + 1, given: given[i], expected: expected[i] }]))
}
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else-if="unknownTrack" class="callout">
    <AppIcon name="info" />
    <span>That quiz doesn't exist. <RouterLink to="/exercises">Back to the exercises</RouterLink></span>
  </div>
  <div v-else class="page">
    <header>
      <h1>{{ trackInfo ? `Quiz: ${trackInfo.label} track` : 'Quiz' }}</h1>
      <p class="lead">
        {{ summary?.questionCount }} questions: {{ summary?.split.easy }} easy, {{ summary?.split.medium }} fill in the blanks,
        and {{ summary?.split.advanced }} about a compose file. You need {{ passPct }}% to pass. Every retake asks new questions, and your best score counts.
      </p>
    </header>

    <section v-if="result" class="score" :class="{ passed: result.passed }" aria-live="polite">
      <div class="score-num">{{ result.score }}<span>/{{ result.total }}</span></div>
      <div class="score-text">
        <h2><AppIcon v-if="result.passed" name="sparkle" />{{ result.passed ? 'You passed!' : 'Not yet' }}</h2>
        <p v-if="trackInfo">{{ result.passed ? 'See the answers below. That is the whole track done.' : 'Read the answers below, review the track, then try a new quiz.' }}</p>
        <p v-else>{{ result.passed ? 'See the answers below, then check the live tracker.' : 'Read the answers below, review the exercises, then try a new quiz.' }}</p>
      </div>
      <div class="row score-actions">
        <button class="btn" type="button" :disabled="loading" @click="start">New quiz</button>
        <RouterLink v-if="trackInfo" :to="`/take-home/${trackInfo.id}`" class="btn primary">Back to the track<AppIcon name="arrow-right" /></RouterLink>
        <RouterLink v-else to="/live" class="btn primary">Live tracker<AppIcon name="arrow-right" /></RouterLink>
      </div>
    </section>

    <p v-if="loading" class="muted">Picking your questions…</p>

    <form v-else-if="paper" class="questions" @submit.prevent="submit">
      <section v-for="section in sections" :key="section.level" class="section" :aria-labelledby="`level-${section.level}`">
        <header class="section-head">
          <h2 :id="`level-${section.level}`">{{ section.title }}</h2>
          <p class="muted">{{ section.intro }}</p>
        </header>

        <template v-for="{ q, index } in section.items" :key="q.id">
          <div v-if="showScenario(index)" class="scenario">
            <h3>{{ showScenario(index)!.title }}</h3>
            <p class="muted">{{ showScenario(index)!.intro }}</p>
            <CodeBlock :code="showScenario(index)!.code" :label="showScenario(index)!.label" />
          </div>

          <fieldset class="question" :disabled="!!result">
            <legend><span class="qnum">{{ index + 1 }}</span><span><RichText :text="q.prompt" /></span></legend>

            <div v-if="q.kind === 'choice'" class="options">
              <label v-for="(opt, oi) in q.options" :key="oi" class="option" :class="optionClass(index, oi)">
                <input v-model="answers[index]" type="radio" :name="q.id" :value="oi" />
                <span class="opt-text"><RichText :text="opt" /></span>
                <template v-if="res(index)">
                  <span v-if="oi === res(index)!.answer" class="verdict ok"><AppIcon name="check" />Correct answer</span>
                  <span v-else-if="oi === res(index)!.chosen" class="verdict bad"><AppIcon name="x" />Your answer</span>
                </template>
              </label>
            </div>

            <div v-else class="blanks">
              <p class="context">{{ q.context }}</p>
              <BlankCode
                :model-value="answers[index] as string[]"
                @update:model-value="(v) => (answers[index] = v)"
                :name="q.id"
                :code="q.code"
                :label="q.label"
                :disabled="!!result"
                :verdicts="res(index)?.blankCorrect"
              />
            </div>

            <div v-if="res(index)" class="explain">
              <p>
                <strong>{{ res(index)!.correct ? 'Correct.' : 'Not quite.' }}</strong>
                <RichText :text="res(index)!.explanation" />
              </p>
              <ul v-if="missedBlanks(index).length" class="missed">
                <li v-for="m in missedBlanks(index)" :key="m.n">
                  Blank {{ m.n }}: you wrote <code>{{ m.given || '(nothing)' }}</code>, the answer is <code>{{ m.expected }}</code>.
                </li>
              </ul>
            </div>
          </fieldset>
        </template>
      </section>

      <div v-if="!result" class="submit">
        <div class="submit-progress">
          <span>{{ answeredCount }} of {{ questions.length }} answered</span>
          <div class="bar" aria-hidden="true"><span :style="{ transform: `scaleX(${answeredCount / questions.length})` }" /></div>
        </div>
        <button class="btn primary" type="submit" :disabled="busy || !complete">Submit answers</button>
      </div>
    </form>
    <div v-if="error" class="callout error" role="alert">
      <AppIcon name="alert" />
      <span>{{ error }} <button v-if="!busy" type="button" class="link" @click="start">Start a new quiz</button></span>
    </div>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
.questions { display: grid; gap: var(--space-7); }
.section { display: grid; gap: var(--space-6); }
.section-head { padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); }
.section-head p { margin: 0; }
.scenario { display: grid; gap: var(--space-2); }
.scenario h3 { margin: 0; }
.scenario p { margin: 0 0 var(--space-2); }

.question { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: var(--space-3); }
.question legend { display: flex; gap: var(--space-3); align-items: baseline; padding: 0; margin-bottom: var(--space-3); font-size: var(--text-lg); font-weight: 650; line-height: 1.35; }
.qnum {
  flex: none; width: 2rem; height: 2rem; border-radius: 50%; display: inline-grid; place-items: center; align-self: flex-start;
  font-size: var(--text-sm); font-weight: 750; color: var(--primary); background: var(--primary-soft);
}
.options, .blanks { display: grid; gap: var(--space-2); padding-left: calc(2rem + var(--space-3)); min-width: 0; }
.context { margin: 0 0 var(--space-2); max-width: 68ch; }
.option {
  display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
  border: 1px solid var(--border-strong); cursor: pointer; background: var(--bg);
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
fieldset:not(:disabled) .option:hover { border-color: var(--ink); }
.option:focus-within { outline: 2px solid var(--primary); outline-offset: 2px; }
.option input { flex: none; width: 1.1rem; height: 1.1rem; margin: 0; accent-color: var(--primary); }
.opt-text { flex: 1; }
.option.selected { border-color: var(--primary); background: var(--primary-soft); }
.option.correct { border-color: var(--primary); background: var(--primary-soft); }
.option.wrong { border-color: var(--error); background: var(--error-soft); }
fieldset:disabled .option { cursor: default; }
.verdict { flex: none; display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-xs); font-weight: 700; }
.verdict svg { width: 1rem; height: 1rem; }
.verdict.ok { color: var(--primary); }
.verdict.bad { color: var(--error); }
.explain { margin-left: calc(2rem + var(--space-3)); color: var(--muted); max-width: 68ch; }
.explain p { margin: 0; }
.explain strong { color: var(--ink); }
.missed { margin: var(--space-2) 0 0; padding-left: var(--space-5); }

.submit {
  position: sticky; bottom: var(--space-3); z-index: var(--z-sticky);
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4); border-radius: var(--radius-lg);
  background: var(--bg); border: 1px solid var(--border); box-shadow: var(--shadow-float);
}
.submit-progress { display: grid; gap: var(--space-2); flex: 1; min-width: 160px; max-width: 280px; font-size: var(--text-sm); font-weight: 600; }
.link { font: inherit; color: inherit; font-weight: 650; background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 0.18em; }

.score {
  display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-5); align-items: center;
  padding: var(--space-5) var(--space-6); border-radius: var(--radius-lg); background: var(--panel);
}
.score.passed { background: var(--highlight-soft); }
.score-num { font-size: 3.5rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; grid-row: span 2; }
.score-num span { font-size: var(--text-xl); color: var(--muted); font-weight: 650; }
.score-text h2 { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
.score-text h2 svg { width: 1.3rem; height: 1.3rem; }
.score-text p { margin: 0; }
.score-actions { grid-column: 2; }
@media (max-width: 560px) {
  .score { grid-template-columns: 1fr; }
  .score-num { grid-row: auto; }
  .score-actions { grid-column: 1; }
  .options, .blanks, .explain { padding-left: 0; margin-left: 0; }
}
</style>
