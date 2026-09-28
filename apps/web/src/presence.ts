import { onBeforeUnmount, watch } from 'vue'
import { api } from './api'
import { state } from './store'

/** How often an open exercise page checks in. The server counts you "here" for 3 minutes after. */
export const PRESENCE_MS = 60_000

/**
 * Tells the server which exercise page is open, for the Live page's "here now" counts.
 * It checks in on arrival and every minute after, even while the student is in their
 * terminal (the tab is still open, so they are still on the exercise). It says goodbye
 * on leaving the page, and with a beacon when the tab closes.
 */
export function usePresence(where: () => string | null) {
  let timer: number | undefined
  const send = (exercise: string | null) => {
    const id = state.progress?.id
    if (id) api.presence(id, exercise).catch(() => {})
  }

  watch(where, (now, before) => {
    clearInterval(timer)
    if (now) {
      send(now)
      timer = window.setInterval(() => send(now), PRESENCE_MS)
    } else if (before) {
      send(null)
    }
  }, { immediate: true })

  const onHide = () => {
    const id = state.progress?.id
    if (id && where()) api.presenceBeacon(id, null)
  }
  // Coming back to a tab the browser kept in memory (back button, restored laptop).
  const onShow = (e: PageTransitionEvent) => {
    const now = where()
    if (e.persisted && now) send(now)
  }
  window.addEventListener('pagehide', onHide)
  window.addEventListener('pageshow', onShow)

  onBeforeUnmount(() => {
    clearInterval(timer)
    window.removeEventListener('pagehide', onHide)
    window.removeEventListener('pageshow', onShow)
    if (where()) send(null)
  })
}
