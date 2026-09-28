<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import RichText from './RichText.vue'
import { chat, CHAT_MAX, deleteChat, postChat, toggleMeToo } from '../chat'
import { state } from '../store'
import type { ChatMessage } from '../api'

/** The chat list and the box to ask in. Used by the /chat page and by the pet's popup. */
defineProps<{ compact?: boolean }>()

const route = useRoute()
const exercises = computed(() => state.content?.exercises ?? [])
const exerciseLabel = (id: string) => {
  const i = exercises.value.findIndex((e) => e.id === id)
  return i < 0 ? null : `${i + 1}. ${exercises.value[i].title}`
}

// Asked from an exercise page? Then it is probably about that exercise.
const routeExercise = () => (route.path.startsWith('/exercises/') && typeof route.params.id === 'string' ? route.params.id : '')
const about = ref(routeExercise())
watch(() => route.fullPath, () => (about.value = routeExercise()))

const body = ref('')
const busy = ref(false)
const error = ref('')
const left = computed(() => CHAT_MAX - body.value.length)
const input = ref<HTMLTextAreaElement | null>(null)
defineExpose({ focus: () => input.value?.focus() })

async function send() {
  const text = body.value.trim()
  if (!text || busy.value || left.value < 0) return
  busy.value = true
  error.value = ''
  try {
    await postChat(text, about.value || null)
    body.value = ''
    stick = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

// Enter sends, Shift+Enter is a new line. Not while an input method is composing.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}

async function act(fn: () => Promise<void>) {
  error.value = ''
  try {
    await fn()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

// Delete takes two presses, so a slip doesn't lose a question. The second press expires.
const confirming = ref<number | null>(null)
let confirmTimer: number | undefined
function onDelete(m: ChatMessage) {
  clearTimeout(confirmTimer)
  if (confirming.value !== m.id) {
    confirming.value = m.id
    confirmTimer = window.setTimeout(() => (confirming.value = null), 4000)
    return
  }
  confirming.value = null
  act(() => deleteChat(m.id))
}
onBeforeUnmount(() => clearTimeout(confirmTimer))

// Newest at the bottom. Follow new messages only if you were already at the bottom (or just sent one).
const list = ref<HTMLElement | null>(null)
let stick = true
function onScroll() {
  const el = list.value
  if (el) stick = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}
watch(
  () => chat.messages,
  async () => {
    if (!stick) return
    await nextTick()
    list.value?.scrollTo({ top: list.value.scrollHeight })
  },
  { immediate: true },
)

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="chat" :class="{ compact }">
    <ol ref="list" class="messages" aria-label="Questions" aria-live="polite" @scroll="onScroll">
      <li v-if="chat.loaded && !chat.messages.length" class="empty muted">No questions yet. If something is not working, ask here: someone else is probably stuck too.</li>
      <li v-for="m in chat.messages" :key="m.id" class="message" :class="{ mine: m.mine }">
        <p class="meta">
          <strong>{{ m.mine ? 'You' : m.author }}</strong>
          <time :datetime="m.createdAt" class="muted">{{ time(m.createdAt) }}</time>
          <RouterLink v-if="m.exercise && exerciseLabel(m.exercise)" :to="`/exercises/${m.exercise}`" class="about">{{ exerciseLabel(m.exercise) }}</RouterLink>
        </p>
        <p class="body"><RichText :text="m.body" /></p>
        <div class="actions">
          <button
            v-if="state.progress && !m.mine"
            type="button"
            class="btn small me-too"
            :class="{ on: m.meToo }"
            :aria-pressed="!!m.meToo"
            @click="act(() => toggleMeToo(m))"
          >
            Me too<span v-if="m.meTooCount" class="count">{{ m.meTooCount }}</span>
          </button>
          <span v-else-if="m.meTooCount" class="muted small">{{ m.meTooCount }} {{ m.meTooCount === 1 ? 'person has' : 'people have' }} this too</span>
          <!-- Both labels share one grid cell so the button keeps its width. -->
          <button v-if="m.mine" type="button" class="btn small ghost swap delete" :class="{ confirm: confirming === m.id }" @click="onDelete(m)">
            <span :aria-hidden="confirming === m.id"><AppIcon name="trash" />Delete</span>
            <span :aria-hidden="confirming !== m.id"><AppIcon name="trash" />Yes, delete</span>
          </button>
        </div>
      </li>
    </ol>

    <div v-if="error" class="callout error" role="alert"><AppIcon name="alert" /><span>{{ error }}</span></div>

    <form v-if="state.progress" class="composer" @submit.prevent="send">
      <label class="sr-only" for="chat-body">Your question</label>
      <textarea
        id="chat-body"
        ref="input"
        v-model="body"
        rows="2"
        placeholder="Ask a question. Wrap commands in `backticks`."
        :maxlength="CHAT_MAX + 50"
        @keydown="onKey"
      />
      <div class="row">
        <label class="about-pick">
          <span class="muted">About</span>
          <select v-model="about">
            <option value="">Nothing in particular</option>
            <option v-for="(e, i) in exercises" :key="e.id" :value="e.id">{{ i + 1 }}. {{ e.title }}</option>
          </select>
        </label>
        <span v-if="left < 100" class="left" :class="{ over: left < 0 }" aria-live="polite">{{ left }} left</span>
        <button type="submit" class="btn small primary" :disabled="busy || !body.trim() || left < 0"><AppIcon name="send" />Send</button>
      </div>
      <p class="muted hint">Enter sends, Shift+Enter for a new line. Others see you as "{{ state.progress.id.split('-').slice(0, 2).join(' ') }}".</p>
    </form>
    <p v-else class="join muted">
      <RouterLink to="/">Get your name badge</RouterLink> to ask a question or say "Me too".
    </p>
  </div>
</template>

<style scoped>
.chat { display: grid; gap: var(--space-3); min-height: 0; }
.messages {
  list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); align-content: start;
  max-height: min(60vh, 40rem); overflow-y: auto; overscroll-behavior: contain;
}
.compact .messages { max-height: min(46vh, 26rem); }
.empty { padding: var(--space-4) 0; }
.message { padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg); display: grid; gap: var(--space-1); }
.message.mine { background: var(--panel); }
.meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-2); margin: 0; font-size: var(--text-sm); }
.meta time { font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
.about { font-size: var(--text-xs); font-weight: 600; color: var(--ink); text-decoration: none; padding: 0 var(--space-2); border-radius: 999px; background: var(--panel-2); }
.about:hover { text-decoration: underline; }
.body { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.actions:empty { display: none; }
.me-too { gap: var(--space-2); }
.me-too .count { font-variant-numeric: tabular-nums; font-weight: 700; }
.me-too.on { color: var(--primary); background: var(--primary-soft); border-color: var(--primary); }
.delete { margin-left: auto; color: var(--muted); }
.delete.confirm { color: var(--error); background: var(--error-soft); }
.small { font-size: var(--text-xs); }

.composer { display: grid; gap: var(--space-2); }
textarea {
  width: 100%; min-height: 3.5rem; resize: vertical; padding: var(--space-2) var(--space-3);
  font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--border-strong); border-radius: var(--radius-md);
}
textarea:focus-visible, select:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.about-pick { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); min-width: 0; flex: 1; }
select { min-width: 0; max-width: 100%; flex: 1; min-height: 2rem; font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 0 var(--space-2); }
.left { font-size: var(--text-xs); color: var(--muted); font-variant-numeric: tabular-nums; }
.left.over { color: var(--error); font-weight: 700; }
.row .btn.primary { margin-left: auto; }
.hint { font-size: var(--text-xs); margin: 0; }
.join { margin: 0; }
</style>
