<script setup lang="ts">
import { toast } from '../clipboard'
import AppIcon from './AppIcon.vue'
</script>

<template>
  <!-- Always in the DOM, so screen readers announce each new message. -->
  <div class="toasts" role="status" aria-live="polite">
    <p v-if="toast.message" :key="toast.seq" class="toast"><AppIcon name="check" />{{ toast.message }}</p>
  </div>
</template>

<style scoped>
/* Bottom centre, clear of the pet in the bottom-right corner. */
.toasts { position: fixed; left: 50%; bottom: var(--space-5); transform: translateX(-50%); z-index: var(--z-popover); pointer-events: none; width: max-content; max-width: calc(100vw - 32px); }
.toast {
  display: flex; align-items: center; gap: var(--space-2); margin: 0; padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm); font-weight: 600; color: var(--bg); background: var(--ink);
  border-radius: 999px; box-shadow: var(--shadow-float); overflow-wrap: anywhere;
  animation: toast-in var(--dur-base) var(--ease-out);
}
.toast svg { flex: none; width: 1rem; height: 1rem; color: var(--primary-soft); }
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
}
@media (prefers-reduced-motion: reduce) {
  .toast { animation: none; }
}
</style>
