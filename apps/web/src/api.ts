export type Step = {
  text: string
  code?: string
  label?: string
  /** Platform-specific gotchas, e.g. { for: 'Windows', text: '…' }. */
  notes?: { for: string; text: string }[]
}

export type FileEntry = {
  /** Folders end with "/". Nesting comes from the path itself. */
  path: string
  note?: string
}

export type Exercise = {
  id: string
  title: string
  minutes: number
  summary: string
  steps: Step[]
  expected: string
  /** Files the student creates in their working folder. Omitted when there are none. */
  files?: { note?: string; entries: FileEntry[] }
}

export type Level = 'easy' | 'medium' | 'advanced'

/** Shown before a quiz starts. The questions themselves come with each paper. */
export type QuizSummary = { passMark: number; minutes: number; split: Record<Level, number>; questionCount: number }

export type ChoiceQuestion = { kind: 'choice'; id: string; level: Level; prompt: string; options: string[]; scenario?: string }
/** code holds {{1}}, {{2}}... where the student types; blanks is how many there are. */
export type BlanksQuestion = { kind: 'blanks'; id: string; level: Level; context: string; prompt: string; label: string; code: string; blanks: number }
export type Question = ChoiceQuestion | BlanksQuestion
export type Scenario = { id: string; title: string; intro: string; label: string; code: string }

/** One quiz: a signed, one-time selection from the pool. */
export type QuizPaper = { token: string; questions: Question[]; scenarios: Scenario[] }
export type Answer = number | string[]

/** Backticks in text render as inline code. seenIn lists exercise ids where the term is used. */
export type Term = { term: string; aka?: string; text: string; seenIn?: string[] }
export type TermGroup = { id: string; title: string; terms: Term[] }

export type Content = {
  exercises: Exercise[]
  quiz: QuizSummary
  glossary: TermGroup[]
  realtime: { key: string }
}

export type Progress = {
  id: string
  completed: string[]
  quiz: { bestScore: number; total: number; passed: boolean; attempts: number } | null
}

export type QuizResult = {
  score: number
  total: number
  passed: boolean
  /** answer is the right option index, or the expected text for each blank. */
  results: { questionId: string; chosen: Answer; answer: Answer; correct: boolean; blankCorrect?: boolean[]; explanation: string }[]
  progress: Progress
}

export type Stats = {
  participants: number
  activeNow: number
  activeWindowMinutes: number
  exerciseCompletionPct: number
  finishedAllExercises: number
  exercises: { id: string; title: string; completed: number }[]
  quiz: { attempted: number; passed: number; averageBestPct: number | null }
  updatedAt: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = res.status === 429 ? 'Too many requests. Wait a few seconds and try again.' : data.message || `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return data as T
}

const p = (id: string) => `/participants/${encodeURIComponent(id)}`

export const api = {
  content: () => request<Content>('GET', '/content'),
  stats: () => request<Stats>('GET', '/stats'),
  suggestId: () => request<{ id: string }>('GET', '/participants/suggestion'),
  join: (id: string) => request<Progress>('POST', '/participants', { id }),
  progress: (id: string) => request<Progress>('GET', p(id)),
  setDone: (id: string, exerciseId: string, done: boolean) =>
    request<Progress>(done ? 'PUT' : 'DELETE', `${p(id)}/exercises/${encodeURIComponent(exerciseId)}`),
  quizPaper: (id: string) => request<QuizPaper>('GET', `${p(id)}/quiz`),
  submitQuiz: (id: string, paper: QuizPaper, answers: Answer[]) =>
    request<QuizResult>('POST', `${p(id)}/quiz`, { token: paper.token, questions: paper.questions.map((q) => q.id), answers }),
}
