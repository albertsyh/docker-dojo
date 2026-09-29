<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import RichText from './RichText.vue'
import { chat } from '../chat'
import { exerciseLabel } from '../store'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

/**
 * The chat for the trainer's screen: read-only, newest first, large text across the full width.
 * It shows the same messages as the rest of the app, kept live by the app-wide listener in
 * chat.ts. Nothing here depends on who is signed in, so it reads the same on any browser.
 */
defineProps<{ embed?: boolean }>()

const newestFirst = computed(() => [...chat.messages].reverse())
const time = (iso: string) => new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="presenter wide-page">
    <header class="head">
      <h1>{{ t('chat.list') }}</h1>
      <span v-if="chat.loaded" class="count muted">{{ t('chat.count', chat.messages.length) }}</span>
      <!-- Both labels share one grid cell so the badge keeps its width. -->
      <span class="status swap" :class="{ on: chat.connected }" role="status">
        <span :aria-hidden="!chat.connected"><i aria-hidden="true" />{{ t('chat.live') }}</span>
        <span :aria-hidden="chat.connected"><i aria-hidden="true" />{{ t('chat.reconnecting') }}</span>
      </span>
      <RouterLink v-if="!embed" :to="{ query: {} }" class="btn small ghost leave"><AppIcon name="x" />{{ t('chat.presenterLeave') }}</RouterLink>
    </header>

    <p v-if="chat.loaded && !chat.messages.length" class="empty muted">{{ t('chat.empty') }}</p>
    <TransitionGroup tag="ol" name="arrive" class="messages" :aria-label="t('chat.list')" aria-live="polite">
      <li v-for="m in newestFirst" :key="m.id" class="message">
        <p class="meta">
          <strong>{{ m.author }}</strong>
          <time :datetime="m.createdAt" class="muted">{{ time(m.createdAt) }}</time>
          <span v-if="m.exercise && exerciseLabel(m.exercise)" class="about">{{ exerciseLabel(m.exercise) }}</span>
          <span v-if="m.meTooCount" class="too">{{ t('chat.othersToo', m.meTooCount) }}</span>
        </p>
        <p class="body"><RichText :text="m.body" /></p>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.presenter { display: grid; gap: var(--space-5); width: 100%; }
.head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2) var(--space-4); }
.head h1 { margin: 0; }
.count { font-size: var(--text-lg); font-variant-numeric: tabular-nums; }
.status { font-size: var(--text-sm); font-weight: 650; color: var(--muted); }
.status > span { display: inline-flex; align-items: center; gap: var(--space-2); }
.status i { width: 10px; height: 10px; border-radius: 50%; background: var(--border-strong); }
.status.on { color: var(--ink); }
.status.on i { background: var(--primary); }
.leave { margin-left: auto; align-self: center; }
.empty { margin: 0; font-size: var(--text-xl); }

.messages { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.message { display: grid; gap: var(--space-2); padding: var(--space-4) var(--space-5); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg); }
.meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-3); margin: 0; font-size: var(--text-lg); }
.meta time { font-variant-numeric: tabular-nums; }
.about { font-size: var(--text-md); font-weight: 600; padding: 0 var(--space-3); border-radius: 999px; background: var(--panel-2); }
.too { font-size: var(--text-md); font-weight: 650; color: var(--primary); }
/* Readable from the back of the room. */
.body { margin: 0; font-size: clamp(var(--text-xl), 1rem + 1.4vw, var(--text-3xl)); line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; }

/* A new question slides in at the top. */
.arrive-enter-active { transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out); }
.arrive-enter-from { opacity: 0; transform: translateY(-0.75rem); }
.arrive-move { transition: transform var(--dur-slow) var(--ease-out); }
</style>
