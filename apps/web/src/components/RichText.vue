<script setup lang="ts">
import { computed } from 'vue'

// Renders `backticked` spans as inline code; everything else stays plain text.
const props = defineProps<{ text: string }>()
const parts = computed(() => props.text.split('`').map((text, i) => ({ text, code: i % 2 === 1 })))
</script>

<template>
  <template v-for="(part, i) in parts" :key="i"><code v-if="part.code">{{ part.text }}</code><template v-else>{{ part.text }}</template></template>
</template>
