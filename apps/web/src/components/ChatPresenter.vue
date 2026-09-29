<script setup lang="ts">
import { computed } from 'vue'
import RichText from './RichText.vue'
import { chat } from '../chat'
import { exerciseLabel } from '../store'
import { IDLE_FRAME_MS, PETS, ROW } from '../pets'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

/**
 * The chat for the trainer's screen: only the conversation, read-only, newest first, in large text
 * across the full width. It shows the same messages as the rest of the app, kept live by the
 * app-wide listener in chat.ts. Nothing here depends on who is signed in.
 */
const newestFirst = computed(() => [...chat.messages].reverse())
const time = (iso: string) => new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })

// No questions yet: Nori, looking sad about it, whichever pet this browser picked.
const nori = PETS.find((p) => p.id === 'nori') ?? PETS[0]
const sadFrames = nori.rows[ROW.sad]
const sadStyle = {
  backgroundImage: `url(${nori.sheet})`,
  '--row': ROW.sad,
  '--frames': sadFrames,
  '--duration': `${sadFrames * IDLE_FRAME_MS}ms`,
}
</script>

<template>
  <div class="presenter wide-page">
    <!-- Nori is from OpenPets (openpets.dev), credited in the footer and README. -->
    <div v-if="chat.loaded && !chat.messages.length" class="empty">
      <span class="sprite" :style="sadStyle" aria-hidden="true" />
      <p class="empty-title">{{ t('chat.presenterEmpty') }}</p>
      <p class="muted">{{ t('chat.presenterEmptyHint') }}</p>
    </div>
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
.presenter { display: grid; width: 100%; }

.empty {
  display: grid; justify-items: center; gap: var(--space-2); text-align: center;
  padding: var(--space-7) var(--space-5); border: 1px dashed var(--border-strong); border-radius: var(--radius-md);
}
.empty p { margin: 0; }
.empty-title { font-size: var(--text-2xl); font-weight: 700; }
.empty .muted { font-size: var(--text-lg); }
/* The sheet is 8 x 9 frames of 96x104 (FRAME_W / FRAME_H in pets.ts), drawn here at double size. */
.sprite {
  display: block; width: 192px; height: 208px; margin-bottom: var(--space-2);
  background-size: 1536px 1872px; background-position: 0 calc(var(--row) * -208px);
  image-rendering: pixelated;
  animation: play var(--duration) steps(var(--frames)) infinite;
}
@keyframes play {
  from { background-position-x: 0; }
  to { background-position-x: calc(var(--frames) * -192px); }
}
@media (prefers-reduced-motion: reduce) {
  .sprite { animation: none; }
}

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
