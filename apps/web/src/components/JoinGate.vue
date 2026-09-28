<script setup lang="ts">
// Shown instead of a page that needs a participant id.
import AppIcon from './AppIcon.vue'
</script>

<template>
  <section class="gate">
    <h1>Get your name badge first</h1>
    <p class="lead">Pick an anonymous id on the start page so your progress is saved. It takes a few seconds.</p>
    <RouterLink to="/" class="btn primary">Go to start<AppIcon name="arrow-right" /></RouterLink>
  </section>
</template>

<style scoped>
.gate { display: grid; gap: var(--space-2); justify-items: start; }
.gate .btn { margin-top: var(--space-3); }
</style>
