<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import ChatPanel from '../components/ChatPanel.vue'
import { chat, loadChat } from '../chat'

// While this page shows, new messages count as read (and the pet's popup stays closed).
onMounted(() => {
  chat.onPage = true
  chat.open = false
  if (!chat.loaded) loadChat().catch(() => {})
})
onBeforeUnmount(() => (chat.onPage = false))
</script>

<template>
  <div class="page">
    <header>
      <h1>Chat</h1>
      <p class="lead">Stuck, or curious? Ask here. The trainer reads these, and "Me too" shows which questions are most common. You can delete your own messages.</p>
    </header>
    <ChatPanel />
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-5); }
.page > header p { margin: 0; }
</style>
