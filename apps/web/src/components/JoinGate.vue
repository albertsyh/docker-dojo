<script setup lang="ts">
// Shown instead of a page that needs a participant id.
import AppIcon from './AppIcon.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="gate">
    <h1>{{ t('gate.title') }}</h1>
    <p class="lead">{{ t('gate.text') }}</p>
    <RouterLink to="/" class="btn primary">{{ t('gate.go') }}<AppIcon name="arrow-right" /></RouterLink>
  </section>
</template>

<style scoped>
.gate { display: grid; gap: var(--space-2); justify-items: start; }
.gate .btn { margin-top: var(--space-3); }
</style>
