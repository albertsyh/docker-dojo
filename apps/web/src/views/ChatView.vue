<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ChatPanel from '../components/ChatPanel.vue'
import ChatPresenter from '../components/ChatPresenter.vue'
import { chat, loadChat } from '../chat'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// ?presenter is the trainer's read-only view for the big screen: only the conversation.
// ?embed shows the same, so a chat on another screen or site is for reading.
const route = useRoute()
const presenter = computed(() => route.query.presenter !== undefined || route.query.embed !== undefined)

// While this page shows, new messages count as read (and the pet's popup stays closed).
onMounted(() => {
  chat.onPage = true
  chat.open = false
  if (!chat.loaded) loadChat().catch(() => {})
})
onBeforeUnmount(() => (chat.onPage = false))
</script>

<template>
  <ChatPresenter v-if="presenter" />
  <div v-else class="page">
    <header>
      <h1>{{ t('chat.title') }}</h1>
      <p class="lead">{{ t('chat.lead') }}</p>
      <RouterLink :to="{ query: { presenter: null } }" class="presenter-link">{{ t('chat.presenterOpen') }}</RouterLink>
    </header>
    <ChatPanel />
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-5); }
.page > header { display: grid; gap: var(--space-2); }
.page > header p { margin: 0; }
.page > header h1 { margin: 0; }
.presenter-link { justify-self: start; font-size: var(--text-sm); font-weight: 600; }
</style>
