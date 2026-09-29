import { t } from './i18n'
import { prefs, type Lang } from './prefs'

export type Step = {
  text: string
  code?: string
  label?: string
  /** code is a change to the file named in label: each line starts with -, + or a space. */
  diff?: boolean
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

/** Further learning: videos and reading, grouped by topic. source says who made it and when. */
export type Reference = { title: string; url: string; kind: 'video' | 'reading'; source: string; note?: string }
export type ReferenceGroup = { id: string; title: string; intro?: string; links: Reference[] }

/** A self-paced track for after the workshop, with its own exercises and quiz. label is short: "Node". */
export type TakeHomeTrack = { id: string; title: string; label: string; summary: string; exercises: Exercise[]; quiz: QuizSummary }

export type Content = {
  /** The language the prose is in. Ids, code and answers are the same in every language. */
  language: Lang
  exercises: Exercise[]
  quiz: QuizSummary
  takeHome: TakeHomeTrack[]
  glossary: TermGroup[]
  references: ReferenceGroup[]
  realtime: { key: string }
}

export type QuizProgress = { bestScore: number; total: number; passed: boolean; attempts: number }

export type Progress = {
  id: string
  /** Every completed exercise id, in any track. */
  completed: string[]
  /** The workshop quiz. */
  quiz: QuizProgress | null
  /** Each take-home track's quiz, by track id. */
  trackQuizzes: Record<string, QuizProgress | null>
}

export type QuizResult = {
  score: number
  total: number
  passed: boolean
  /** answer is the right option index, or the expected text for each blank. */
  results: { questionId: string; chosen: Answer; answer: Answer; correct: boolean; blankCorrect?: boolean[]; explanation: string }[]
  progress: Progress
}

/** A chat message. author is a display name ("brave otter"), never an id. mine/meToo only come with your own view. */
export type ChatMessage = {
  id: number
  author: string
  body: string
  exercise: string | null
  createdAt: string
  meTooCount: number
  mine?: boolean
  meToo?: boolean
}
export type ChatList = { messages: ChatMessage[] }

export type StatsExercise = { id: string; title: string; completed: number; here: number }

export type Stats = {
  participants: number
  activeNow: number
  activeWindowMinutes: number
  hereWindowMinutes: number
  exerciseCompletionPct: number
  finishedAllExercises: number
  /** here = people with that exercise page open right now. Workshop exercises only; the figures above count these. */
  exercises: StatsExercise[]
  /** Take-home tracks, for their own section. */
  takeHome: { id: string; title: string; label: string; exercises: StatsExercise[] }[]
  /** attempted = submitted at least once. takingNow = opened a quiz, not submitted yet, active in the window. */
  quiz: { attempted: number; passed: number; takingNow: number; averageBestPct: number | null }
  updatedAt: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Content, quiz text and messages come in the viewer's language. English needs no parameter.
const withLang = (path: string) => (prefs.lang === 'en' ? path : `${path}${path.includes('?') ? '&' : '?'}lang=${prefs.lang}`)

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${withLang(path)}`, {
    method,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = res.status === 429 ? t('errors.tooMany') : data.message || t('errors.failed', { status: res.status })
    throw new ApiError(res.status, message)
  }
  return data as T
}

const p = (id: string) => `/participants/${encodeURIComponent(id)}`
const quizPath = (id: string, track?: string) => `${p(id)}/quiz${track ? `/${encodeURIComponent(track)}` : ''}`

export const api = {
  content: () => request<Content>('GET', '/content'),
  stats: () => request<Stats>('GET', '/stats'),
  suggestId: () => request<{ id: string }>('GET', '/participants/suggestion'),
  join: (id: string) => request<Progress>('POST', '/participants', { id }),
  progress: (id: string) => request<Progress>('GET', p(id)),
  setDone: (id: string, exerciseId: string, done: boolean) =>
    request<Progress>(done ? 'PUT' : 'DELETE', `${p(id)}/exercises/${encodeURIComponent(exerciseId)}`),
  presence: (id: string, exercise: string | null) => request<{ exercise: string | null }>('POST', `${p(id)}/presence`, { exercise }),
  /** For pagehide: a beacon still arrives after the tab has gone. */
  presenceBeacon: (id: string, exercise: string | null) =>
    navigator.sendBeacon(`/api${p(id)}/presence`, new Blob([JSON.stringify({ exercise })], { type: 'application/json' })),
  chat: () => request<ChatList>('GET', '/chat'),
  chatFor: (id: string) => request<ChatList>('GET', `${p(id)}/chat`),
  postChat: (id: string, body: string, exercise: string | null) => request<ChatList>('POST', `${p(id)}/chat`, { body, exercise }),
  deleteChat: (id: string, messageId: number) => request<ChatList>('DELETE', `${p(id)}/chat/${messageId}`),
  setMeToo: (id: string, messageId: number, on: boolean) => request<ChatList>(on ? 'PUT' : 'DELETE', `${p(id)}/chat/${messageId}/me-too`),
  /** No track means the workshop quiz. */
  quizPaper: (id: string, track?: string) => request<QuizPaper>('GET', quizPath(id, track)),
  /** The same paper's questions in the current language, for switching mid-quiz. */
  quizQuestions: (id: string, questionIds: string[], track?: string) =>
    request<Omit<QuizPaper, 'token'>>('GET', `${p(id)}/quiz-questions${track ? `/${encodeURIComponent(track)}` : ''}?${questionIds.map((q) => `ids[]=${encodeURIComponent(q)}`).join('&')}`),
  submitQuiz: (id: string, paper: QuizPaper, answers: Answer[], track?: string) =>
    request<QuizResult>('POST', quizPath(id, track), { token: paper.token, questions: paper.questions.map((q) => q.id), answers }),
}
