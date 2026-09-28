<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import RichText from '../components/RichText.vue'
import { exerciseLabel, state } from '../store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const query = ref('')

// Exercise titles for the "Used in" links, looked up by id.
// Exercise ids in any track, with their labels ("3. Run a web server", "Node 3. Stop cleanly").
const exercises = computed(() => {
  const ids = [...(state.content?.exercises ?? []), ...(state.content?.takeHome.flatMap((t) => t.exercises) ?? [])].map((e) => e.id)
  return new Map(ids.map((id) => [id, exerciseLabel(id)!]))
})

// Served with the rest of the content, from apps/api/resources/content/glossary.json.
const glossary = computed(() => state.content?.glossary ?? [])
const total = computed(() => glossary.value.reduce((sum, g) => sum + g.terms.length, 0))

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return glossary.value
  return glossary.value.map((g) => ({
    ...g,
    terms: g.terms.filter((t) => `${t.term} ${t.aka ?? ''} ${t.text}`.toLowerCase().includes(q)),
  })).filter((g) => g.terms.length)
})
const matches = computed(() => groups.value.reduce((sum, g) => sum + g.terms.length, 0))
</script>

<template>
  <div class="page">
    <header>
      <h1>{{ t('glossary.title') }}</h1>
      <p class="lead">{{ t('glossary.lead') }}</p>
    </header>

    <div class="tools">
      <label class="search">
        <AppIcon name="search" />
        <span class="sr-only">{{ t('glossary.search') }}</span>
        <input v-model="query" type="search" :placeholder="t('glossary.placeholder')" autocomplete="off" spellcheck="false" />
      </label>
      <nav v-if="!query.trim()" class="topics" :aria-label="t('glossary.topics')">
        <RouterLink v-for="g in glossary" :key="g.id" :to="{ hash: `#${g.id}` }">{{ g.title }}</RouterLink>
      </nav>
      <p class="count muted" aria-live="polite">
        <template v-if="query.trim()">{{ t('glossary.matches', { matches, total }) }}</template>
        <template v-else>{{ t('glossary.total', total) }}</template>
      </p>
    </div>

    <section v-for="g in groups" :id="g.id" :key="g.id" class="group" :aria-labelledby="`${g.id}-title`">
      <h2 :id="`${g.id}-title`">{{ g.title }}</h2>
      <dl>
        <div v-for="term in g.terms" :key="term.term" class="entry">
          <dt>
            <span class="term">{{ term.term }}</span>
            <code v-if="term.aka" class="aka">{{ term.aka }}</code>
          </dt>
          <dd>
            <p><RichText :text="term.text" /></p>
            <p v-if="term.seenIn?.some((id) => exercises.has(id))" class="used muted">
              {{ t('glossary.usedIn') }}
              <template v-for="(id, i) in term.seenIn.filter((id) => exercises.has(id))" :key="id">
                <template v-if="i > 0">, </template>
                <RouterLink :to="`/exercises/${id}`">{{ exercises.get(id) }}</RouterLink>
              </template>
            </p>
          </dd>
        </div>
      </dl>
    </section>

    <div v-if="!groups.length" class="callout">
      <AppIcon name="info" />
      <span>{{ t('glossary.noMatch', { query: query.trim() }) }} <button type="button" class="link" @click="query = ''">{{ t('glossary.clear') }}</button></span>
    </div>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
.page > header p { margin: 0; }

.tools { display: grid; gap: var(--space-3); }
.search { position: relative; display: flex; }
.search svg { position: absolute; left: var(--space-3); top: 50%; width: 1.1rem; height: 1.1rem; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.search input {
  flex: 1; min-width: 0; min-height: 2.75rem; padding: 0 var(--space-3) 0 2.5rem;
  font: inherit; color: var(--ink); background: var(--bg);
  border: 1px solid var(--border-strong); border-radius: var(--radius-md);
}
.search input::placeholder { color: var(--muted); }
.search input:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.topics { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.topics a {
  font-size: var(--text-sm); font-weight: 600; color: var(--ink); text-decoration: none;
  padding: var(--space-1) var(--space-3); border: 1px solid var(--border); border-radius: 999px;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.topics a:hover { background: var(--panel); border-color: var(--border-strong); }
.count { margin: 0; font-size: var(--text-sm); }

.group { scroll-margin-top: 88px; }
.group h2 { padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); margin-bottom: 0; }
dl { margin: 0; }
.entry { display: grid; gap: var(--space-1) var(--space-5); padding: var(--space-4) 0; border-bottom: 1px solid var(--border); }
.entry:last-child { border-bottom: 0; }
/* Wide screens: term on the left, meaning on the right, like a printed glossary. */
@media (min-width: 640px) {
  .entry { grid-template-columns: 13rem minmax(0, 1fr); }
}
dt { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-2); }
.term { font-weight: 700; }
.aka { font-size: var(--text-xs); color: var(--muted); }
dd { margin: 0; min-width: 0; }
dd p { margin: 0; max-width: 62ch; }
.used { font-size: var(--text-sm); margin-top: var(--space-1); }

.link { font: inherit; color: var(--primary); background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 0.18em; }
</style>
