import { computed, reactive } from 'vue'
import { api, ApiError, type Content, type Exercise, type Progress, type TakeHomeTrack } from './api'
import { petReact } from './pets'

const STORAGE_KEY = 'docker-dojo:participant'

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storeId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode etc.; progress still works for this tab */
  }
}

export const state = reactive({
  content: null as Content | null,
  progress: null as Progress | null,
  loading: true,
  error: '',
})

/** Completed ids in every track. */
export const completed = computed(() => new Set(state.progress?.completed ?? []))

/** Completed workshop exercises only: the header, home page and journey count these. */
export const coreCompleted = computed(() => {
  const ids = new Set(state.content?.exercises.map((e) => e.id) ?? [])
  return new Set([...completed.value].filter((id) => ids.has(id)))
})

/** The first workshop exercise not yet done, or null when every one is done. */
export const nextExercise = computed(() => state.content?.exercises.find((e) => !completed.value.has(e.id)) ?? null)

export const quizMinutes = computed(() => state.content?.quiz.minutes ?? 0)
export const totalMinutes = computed(() => state.content?.exercises.reduce((sum, e) => sum + e.minutes, 0) ?? 0)

export function takeHomeTrack(trackId: string): TakeHomeTrack | null {
  return state.content?.takeHome.find((t) => t.id === trackId) ?? null
}

/** Which list an exercise belongs to: the workshop (track null) or a take-home track. */
export function trackOf(exerciseId: string): { track: TakeHomeTrack | null; list: Exercise[] } | null {
  if (!state.content) return null
  if (state.content.exercises.some((e) => e.id === exerciseId)) return { track: null, list: state.content.exercises }
  const track = state.content.takeHome.find((t) => t.exercises.some((e) => e.id === exerciseId))
  return track ? { track, list: track.exercises } : null
}

/** "3. Run a web server" for the workshop, "Node 3. Stop cleanly" for a take-home track. */
export function exerciseLabel(exerciseId: string): string | null {
  const place = trackOf(exerciseId)
  if (!place) return null
  const i = place.list.findIndex((e) => e.id === exerciseId)
  return `${place.track ? `${place.track.label} ` : ''}${i + 1}. ${place.list[i].title}`
}

/** Where a track's quiz lives: /quiz for the workshop, /take-home/<id>/quiz for a track. */
export const quizRoute = (track: TakeHomeTrack | null) => (track ? `/take-home/${track.id}/quiz` : '/quiz')

export async function boot() {
  try {
    state.content = await api.content()
    const id = readStoredId()
    if (id) await resume(id).catch(() => storeId(null))
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
  } finally {
    state.loading = false
  }
}

/** Claim an id the student has seen and accepted. Throws ApiError 409 if it was taken meanwhile. */
export async function join(id: string) {
  state.progress = await api.join(id)
  petReact('wave')
  storeId(state.progress.id)
}

/** Continue with an id from another browser/device. Throws if it doesn't exist. */
export async function resume(id: string) {
  try {
    state.progress = await api.progress(id.trim().toLowerCase())
    storeId(state.progress.id)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw new Error('No participant with that id.')
    throw e
  }
}

export function leave() {
  state.progress = null
  storeId(null)
}

export async function setDone(exerciseId: string, done: boolean) {
  if (!state.progress) return
  state.progress = await api.setDone(state.progress.id, exerciseId, done)
  if (done) petReact('jump')
}
