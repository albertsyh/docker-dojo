<script setup lang="ts">
import type { StatsExercise } from '../api'

// One row per exercise on the Live page: how many are on it now, and how many have done it.
defineProps<{
  /** n is the exercise's number in its own track, kept when the list is narrowed. */
  rows: (StatsExercise & { n: number })[]
  participants: number
  hereWindowMinutes: number
  /** The exercise named in the URL, highlighted. */
  current?: string | null
  /** Nothing done yet: the bars step back. */
  quiet?: boolean
}>()

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
</script>

<template>
  <div class="ladder-head" aria-hidden="true">
    <span />
    <span class="here-head" :title="`Has the exercise open (checked in within the last ${hereWindowMinutes} min)`"><i />Here now</span>
    <span>Done</span>
  </div>
  <ol class="ladder" :class="{ quiet }">
    <li v-for="ex in rows" :key="ex.id" :class="{ current: ex.id === current }" :aria-current="ex.id === current ? 'step' : undefined">
      <span class="ex-num muted">{{ ex.n }}</span>
      <span class="ex-name">{{ ex.title }}</span>
      <span class="track" aria-hidden="true"><span :style="{ transform: `scaleX(${pct(ex.completed, participants) / 100})` }" /></span>
      <span class="ex-here">
        <span v-if="ex.here" class="here-pill"><i aria-hidden="true" />{{ ex.here }}<span class="sr-only"> here now</span></span>
      </span>
      <span class="ex-count">
        <template v-if="ex.completed">{{ ex.completed }}<span class="muted"> · {{ pct(ex.completed, participants) }}%</span></template>
        <span v-else class="none">0<span class="sr-only"> done</span></span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
/* One grid for the column labels and every row, so the columns line up.
   Titles wrap rather than truncate; the bar takes whatever is left. */
.ladder-head, .ladder li {
  display: grid; grid-template-columns: 1.6em minmax(0, 16rem) minmax(0, 1fr) 5.5rem 6.5rem;
  gap: var(--space-2) var(--space-4); align-items: center;
}
.ladder-head { font-size: var(--text-xs); font-weight: 650; color: var(--muted); margin-bottom: var(--space-2); }
.ladder-head > :first-child { grid-column: 1 / 4; }
.ladder-head > span:not(:first-child) { text-align: right; }
.here-head { display: inline-flex; align-items: center; justify-content: flex-end; gap: var(--space-1); }
.here-head i { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); }

.ladder { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.ladder li { font-size: var(--text-lg); }
.ex-num { font-variant-numeric: tabular-nums; }
/* The exercise named in the URL: the highlighter's "you are here", bled into the gutter so columns stay aligned. */
.ladder li.current { background: var(--highlight-soft); border-radius: var(--radius-md); margin-inline: calc(-1 * var(--space-3)); padding: var(--space-2) var(--space-3); }
.ex-name { font-weight: 600; line-height: 1.25; text-wrap: balance; overflow-wrap: anywhere; }
.track { height: 14px; border-radius: 999px; background: var(--panel-2); overflow: hidden; }
.track > span { display: block; height: 100%; background: var(--primary); transform-origin: left; transition: transform var(--dur-slow) var(--ease-out); }
/* Nothing done yet: the bars step back so the room reads the list, not a wall of zeros. */
.ladder.quiet .track { opacity: 0.55; }
.ex-here { text-align: right; }
.here-pill {
  display: inline-flex; align-items: center; gap: var(--space-1); padding: 0 var(--space-2); border-radius: 999px;
  font-size: var(--text-sm); font-weight: 700; font-variant-numeric: tabular-nums; color: var(--primary); background: var(--primary-soft);
}
.here-pill i { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); }
.ex-count { font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.ex-count .none { font-weight: 500; color: var(--muted); }
@media (max-width: 640px) {
  .ladder-head, .ladder li { grid-template-columns: 1.6em minmax(0, 1fr) auto auto; font-size: var(--text-md); }
  .ladder-head > :first-child { grid-column: 1 / 3; }
  .track { grid-column: 2 / -1; grid-row: 2; }
}
</style>
