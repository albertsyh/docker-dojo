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

export type Question = { id: string; prompt: string; options: string[] }

export type Content = {
  exercises: Exercise[]
  quiz: { passMark: number; questions: Question[] }
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
  results: { questionId: string; chosen: number; answer: number; correct: boolean; explanation: string }[]
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
  submitQuiz: (id: string, answers: number[]) => request<QuizResult>('POST', `${p(id)}/quiz`, { answers }),
}
