<script setup lang="ts">
import { computed, ref } from 'vue'
import { api, type QuizResult } from '../api'
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
  <div v-else class="stack">
    <div>
      <h1>Quiz</h1>
      <p class="muted">{{ questions.length }} questions. You need {{ passPct }}% to pass. You can retake it, and your best score counts.</p>
    </div>

    <div v-if="result" class="card score" :class="result.passed ? 'pass' : 'fail'">
      <div class="big">{{ result.score }}/{{ result.total }}</div>
      <div>
        <strong>{{ result.passed ? 'You passed!' : 'Not yet' }}</strong>
        <p class="muted" style="margin: 0">
          {{ result.passed ? 'See the answers below, then check the live tracker.' : 'Read the answers below, review the exercises, then try again.' }}
        </p>
      </div>
      <div class="row" style="margin-left: auto">
        <button class="btn" type="button" @click="reset">Retake</button>
        <RouterLink to="/live" class="btn primary">Live tracker</RouterLink>
      </div>
    </div>

    <form class="stack" @submit.prevent="submit">
      <fieldset v-for="(q, qi) in questions" :key="q.id" class="card question" :disabled="!!result">
        <legend><span class="qnum">{{ qi + 1 }}.</span> <RichText :text="q.prompt" /></legend>
        <label v-for="(opt, oi) in q.options" :key="oi" class="option" :class="optionClass(qi, oi)">
          <input v-model="answers[qi]" type="radio" :name="q.id" :value="oi" />
          <span><RichText :text="opt" /></span>
        </label>
        <p v-if="result" class="explain" :class="result.results[qi].correct ? 'ok' : 'bad'">
          <strong>{{ result.results[qi].correct ? 'Correct.' : 'Incorrect.' }}</strong>
          <RichText :text="result.results[qi].explanation" />
        </p>
      </fieldset>

      <div v-if="!result" class="row submit card">
        <span class="muted">{{ answeredCount }} of {{ questions.length }} answered</span>
        <button class="btn primary" type="submit" :disabled="busy || answeredCount < questions.length">Submit answers</button>
      </div>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.question { border: 1px solid var(--border); margin: 0; display: grid; gap: 8px; }
.question legend { float: left; width: 100%; font-weight: 650; margin-bottom: 6px; padding: 0; }
.question legend + * { clear: both; }
.qnum { color: var(--accent); }
.option {
  display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--border); cursor: pointer;
}
.option:hover { border-color: var(--accent); }
.option input { margin-top: 4px; accent-color: var(--accent); }
.option.selected { border-color: var(--accent); background: var(--accent-soft); }
.option.correct { border-color: var(--ok); background: var(--ok-soft); }
.option.wrong { border-color: var(--bad); background: var(--bad-soft); }
fieldset:disabled .option { cursor: default; }
.explain { margin: 4px 0 0; padding: 10px 12px; border-radius: 10px; font-size: 0.95rem; }
.explain.ok { background: var(--ok-soft); }
.explain.bad { background: var(--bad-soft); }
.submit { justify-content: space-between; position: sticky; bottom: 12px; }
.score { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
.score .big { font-size: 2.4rem; font-weight: 800; letter-spacing: -0.03em; }
.score.pass { border-left: 5px solid var(--ok); }
.score.fail { border-left: 5px solid var(--bad); }
</style>
