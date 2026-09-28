import { computed, reactive } from 'vue'
import { api, ApiError, type Content, type Progress } from './api'
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

export const completed = computed(() => new Set(state.progress?.completed ?? []))

/** The first exercise not yet done, or null when every exercise is done. */
export const nextExercise = computed(() => state.content?.exercises.find((e) => !completed.value.has(e.id)) ?? null)

export const totalMinutes = computed(() => state.content?.exercises.reduce((sum, e) => sum + e.minutes, 0) ?? 0)

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
