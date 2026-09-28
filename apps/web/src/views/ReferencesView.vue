<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { state } from '../store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Served with the rest of the content, from apps/api/resources/content/references.json.
const groups = computed(() => state.content?.references ?? [])

// Shown next to the source, so students know where a link goes before they click.
const host = (url: string) => new URL(url).hostname.replace(/^www\./, '')
</script>

<template>
  <div class="page">
    <header>
      <h1>{{ t('references.title') }}</h1>
      <p class="lead">{{ t('references.lead') }}</p>
    </header>

    <nav class="topics" :aria-label="t('references.topics')">
      <RouterLink v-for="g in groups" :key="g.id" :to="{ hash: `#${g.id}` }">{{ g.title }}</RouterLink>
    </nav>

    <section v-for="g in groups" :id="g.id" :key="g.id" class="group" :aria-labelledby="`${g.id}-title`">
      <h2 :id="`${g.id}-title`">{{ g.title }}</h2>
      <p v-if="g.intro" class="intro">{{ g.intro }}</p>
      <ul>
        <li v-for="link in g.links" :key="link.url" class="entry">
          <span class="kind" :title="link.kind === 'video' ? t('references.video') : t('references.reading')">
            <AppIcon :name="link.kind === 'video' ? 'play' : 'book'" />
            <span class="sr-only">{{ link.kind === 'video' ? t('references.video') : t('references.reading') }}:</span>
          </span>
          <div class="body">
            <a :href="link.url" target="_blank" rel="noopener noreferrer" class="title">
              {{ link.title }}<AppIcon name="external" class="ext" /><span class="sr-only">{{ ' ' + t('common.opensInNewTab') }}</span>
            </a>
            <p class="meta muted">{{ link.source }} · {{ host(link.url) }}</p>
            <p v-if="link.note" class="note">{{ link.note }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-6); }
.page > header p { margin: 0; }

.topics { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.topics a {
  font-size: var(--text-sm); font-weight: 600; color: var(--ink); text-decoration: none;
  padding: var(--space-1) var(--space-3); border: 1px solid var(--border); border-radius: 999px;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.topics a:hover { background: var(--panel); border-color: var(--border-strong); }

.group { scroll-margin-top: 88px; }
.group h2 { padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); margin-bottom: 0; }
.intro { margin: var(--space-3) 0 0; max-width: 62ch; }
ul { list-style: none; margin: 0; padding: 0; }
.entry { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4) 0; border-bottom: 1px solid var(--border); }
.entry:last-child { border-bottom: 0; }
.kind { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: var(--radius-md); background: var(--panel); color: var(--muted); }
.kind svg { width: 1.1rem; height: 1.1rem; }
.body { min-width: 0; }
.body p { margin: 0; max-width: 62ch; }
.title { font-weight: 700; overflow-wrap: anywhere; }
.ext { display: inline-block; width: 0.85em; height: 0.85em; margin-left: 0.3em; vertical-align: -0.05em; }
.meta { font-size: var(--text-sm); margin-top: var(--space-1); }
.note { margin-top: var(--space-1); }
</style>
