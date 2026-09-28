import { computed, reactive, watch } from 'vue'
import { api, type ChatMessage } from './api'
import { pet } from './pets'
import { getEcho } from './realtime'
import { state } from './store'

// The questions chat. The server only says "something changed" over the websocket;
// each browser then fetches its own view, which is the only place "mine" is known.

const SEEN_KEY = 'docker-dojo:chat-seen'
export const CHAT_MAX = 500
const POLL_MS = 30_000

function readSeen(): number | null {
  try {
    const v = Number(localStorage.getItem(SEEN_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

export const chat = reactive({
  messages: [] as ChatMessage[],
  loaded: false,
  /** The popup by the pet. */
  open: false,
  /** True while the /chat page is showing. */
  onPage: false,
  connected: false,
  /** The newest message id this browser has had in front of it. */
  seenId: readSeen(),
})

/** New messages from other people since the chat was last in view. */
export const unread = computed(() => (chat.seenId === null ? 0 : chat.messages.filter((m) => m.id > chat.seenId! && !m.mine).length))

function markSeen() {
  const newest = chat.messages.at(-1)?.id ?? 0
  if (chat.seenId !== null && newest <= chat.seenId) return
  chat.seenId = newest
  try {
    localStorage.setItem(SEEN_KEY, String(newest))
  } catch {
    /* storage blocked: unread resets on reload, nothing worse */
  }
}

// In view means seen. A first visit also counts the existing history as seen,
// so nobody opens the Dojo to a badge of old questions.
watch(
  () => [chat.messages, chat.open, chat.onPage] as const,
  () => {
    if (chat.loaded && (chat.open || chat.onPage || chat.seenId === null)) markSeen()
  },
  { deep: false },
)

export async function loadChat() {
  const id = state.progress?.id
  const { messages } = id ? await api.chatFor(id) : await api.chat()
  chat.messages = messages
  chat.loaded = true
}

function withId() {
  const id = state.progress?.id
  if (!id) throw new Error('Get your name badge first.')
  return id
}

export async function postChat(body: string, exercise: string | null) {
  chat.messages = (await api.postChat(withId(), body, exercise)).messages
}

export async function deleteChat(messageId: number) {
  chat.messages = (await api.deleteChat(withId(), messageId)).messages
}

export async function toggleMeToo(message: ChatMessage) {
  chat.messages = (await api.setMeToo(withId(), message.id, !message.meToo)).messages
}

/** The pet's popup. It shares the pet's corner with the pet picker, so one closes the other. */
export function toggleChat() {
  chat.open = !chat.open
  if (chat.open) pet.pickerOpen = false
}
watch(() => pet.pickerOpen, (open) => open && (chat.open = false))

// Joining, resuming or leaving changes which messages are "mine".
watch(() => state.progress?.id, () => chat.loaded && loadChat().catch(() => {}))

let started = false

/** Listen for changes once per page load. Polls instead while the websocket is down. */
export function startChat(key: string | undefined) {
  if (started) return
  started = true
  const refresh = () => loadChat().catch(() => {})
  refresh()
  window.setInterval(() => !chat.connected && refresh(), POLL_MS)
  if (!key) return

  const echo = getEcho(key)
  echo.channel('chat').listen('.chat.updated', refresh)
  echo.connector.pusher.connection.bind('state_change', ({ current }: { current: string }) => {
    const was = chat.connected
    chat.connected = current === 'connected'
    // Catch up on anything missed while disconnected.
    if (chat.connected && !was) refresh()
  })
  chat.connected = echo.connector.pusher.connection.state === 'connected'
}
