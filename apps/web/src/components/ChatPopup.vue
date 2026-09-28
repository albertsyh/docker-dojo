<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import ChatPanel from './ChatPanel.vue'
import { chat, toggleChat } from '../chat'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const panel = ref<InstanceType<typeof ChatPanel> | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') toggleChat()
}
onMounted(async () => {
  document.addEventListener('keydown', onKey)
  await nextTick()
  panel.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="popup" role="dialog" aria-labelledby="chat-popup-title">
    <header>
      <h2 id="chat-popup-title"><AppIcon name="chat" />{{ t('chat.popupTitle') }}</h2>
      <RouterLink to="/chat" class="full" @click="chat.open = false">{{ t('chat.openPage') }}</RouterLink>
      <button class="btn small ghost close" type="button" :aria-label="t('common.close')" @click="toggleChat"><AppIcon name="x" /></button>
    </header>
    <ChatPanel ref="panel" compact />
  </section>
</template>

<style scoped>
/* Floats above the pet in the bottom-right corner, like the pet picker. */
.popup {
  position: fixed; right: var(--space-4); bottom: 136px; z-index: var(--z-popover);
  width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 160px); overflow-y: auto;
  padding: var(--space-4); display: grid; gap: var(--space-3);
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-float);
  animation: rise var(--dur-base) var(--ease-out);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
}
@media (prefers-reduced-motion: reduce) {
  .popup { animation: none; }
}
header { display: flex; align-items: center; gap: var(--space-3); }
h2 { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); margin: 0; }
h2 svg { width: 1.1rem; height: 1.1rem; }
.full { margin-left: auto; font-size: var(--text-xs); }
.close { width: 2rem; padding: 0; }
@media (max-width: 999px) {
  .popup { display: none; }
}
</style>
