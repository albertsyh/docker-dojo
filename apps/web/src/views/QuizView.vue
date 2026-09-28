<script setup lang="ts">
import { computed, ref } from 'vue'
import { api, type QuizResult } from '../api'
import AppIcon from '../components/AppIcon.vue'
import JoinGate from '../components/JoinGate.vue'
import { petReact } from '../pets'
import RichText from '../components/RichText.vue'
import { state } from '../store'

const questions = computed(() => state.content?.quiz.questions ?? [])
const passPct = computed(() => Math.round((state.content?.quiz.passMark ?? 0) * 100))

const answers = ref<(number | null)[]>([])
const result = ref<QuizResult | null>(null)
const busy = ref(false)
const error = ref('')

function reset() {
  answers.value = questions.value.map(() => null)
  result.value = null
  error.value = ''
}
reset()

const answeredCount = computed(() => answers.value.filter((a) => a !== null).length)

async function submit() {
  if (!state.progress || answeredCount.value < questions.value.length) return
  busy.value = true
  error.value = ''
  try {
    result.value = await api.submitQuiz(state.progress.id, answers.value as number[])
    state.progress = result.value.progress
    petReact(result.value.passed ? 'jump' : 'sad')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function optionClass(qi: number, oi: number) {
  const r = result.value?.results[qi]
  if (!r) return { selected: answers.value[qi] === oi }
  return { correct: oi === r.answer, wrong: oi === r.chosen && !r.correct, selected: oi === r.chosen }
}
</script>

<template>
  <JoinGate v-if="!state.progress" />
  <div v-else class="page">
    <header>
      <h1>Quiz</h1>
      <p class="lead">{{ questions.length }} questions. You need {{ passPct }}% to pass. You can retake it, and your best score counts.</p>
    </header>

    <section v-if="result" class="score" :class="{ passed: result.passed }" aria-live="polite">
      <div class="score-num">{{ result.score }}<span>/{{ result.total }}</span></div>
      <div class="score-text">
        <h2><AppIcon v-if="result.passed" name="sparkle" />{{ result.passed ? 'You passed!' : 'Not yet' }}</h2>
        <p>{{ result.passed ? 'See the answers below, then check the live tracker.' : 'Read the answers below, review the exercises, then try again.' }}</p>
      </div>
      <div class="row score-actions">
        <button class="btn" type="button" @click="reset">Retake</button>
        <RouterLink to="/live" class="btn primary">Live tracker<AppIcon name="arrow-right" /></RouterLink>
      </div>
    </section>

    <form class="questions" @submit.prevent="submit">
      <fieldset v-for="(q, qi) in questions" :key="q.id" class="question" :disabled="!!result">
        <legend><span class="qnum">{{ qi + 1 }}</span><span><RichText :text="q.prompt" /></span></legend>
        <div class="options">
          <label v-for="(opt, oi) in q.options" :key="oi" class="option" :class="optionClass(qi, oi)">
            <input v-model="answers[qi]" type="radio" :name="q.id" :value="oi" />
            <span class="opt-text"><RichText :text="opt" /></span>
            <template v-if="result">
              <span v-if="oi === result.results[qi].answer" class="verdict ok"><AppIcon name="check" />Correct answer</span>
              <span v-else-if="oi === result.results[qi].chosen" class="verdict bad"><AppIcon name="x" />Your answer</span>
            </template>
          </label>
        </div>
        <p v-if="result" class="explain">
          <strong>{{ result.results[qi].correct ? 'Correct.' : 'Not quite.' }}</strong>
          <RichText :text="result.results[qi].explanation" />
        </p>
      </fieldset>

      <div v-if="!result" class="submit">
        <div class="submit-progress">
          <span>{{ answeredCount }} of {{ questions.length }} answered</span>
          <div class="bar" aria-hidden="true"><span :style="{ transform: `scaleX(${answeredCount / questions.length})` }" /></div>
        </div>
        <button class="btn primary" type="submit" :disabled="busy || answeredCount < questions.length">Submit answers</button>
      </div>
    </form>
    <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
.questions { display: grid; gap: var(--space-6); }
.question { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: var(--space-3); }
.question legend { display: flex; gap: var(--space-3); align-items: baseline; padding: 0; margin-bottom: var(--space-3); font-size: var(--text-lg); font-weight: 650; line-height: 1.35; }
.qnum {
  flex: none; width: 2rem; height: 2rem; border-radius: 50%; display: inline-grid; place-items: center; align-self: flex-start;
  font-size: var(--text-sm); font-weight: 750; color: var(--primary); background: var(--primary-soft);
}
.options { display: grid; gap: var(--space-2); padding-left: calc(2rem + var(--space-3)); }
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
.explain { margin: 0 0 0 calc(2rem + var(--space-3)); color: var(--muted); max-width: 68ch; }
.explain strong { color: var(--ink); }

.submit {
  position: sticky; bottom: var(--space-3); z-index: var(--z-sticky);
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4); border-radius: var(--radius-lg);
  background: var(--bg); border: 1px solid var(--border); box-shadow: var(--shadow-float);
}
.submit-progress { display: grid; gap: var(--space-2); flex: 1; min-width: 160px; max-width: 280px; font-size: var(--text-sm); font-weight: 600; }

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
  .options, .explain { padding-left: 0; margin-left: 0; }
}
</style>
