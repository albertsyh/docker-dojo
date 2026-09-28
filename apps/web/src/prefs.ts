import { reactive } from 'vue'

// Per-viewer display preferences. index.html applies the stored values before
// first paint; this module keeps them in sync afterwards.

export type Theme = 'light' | 'dark'
export const TEXT_SCALES = [1, 1.15, 1.3] as const

const THEME_KEY = 'docker-dojo:theme'
const SCALE_KEY = 'docker-dojo:text-scale'
const root = document.documentElement
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage blocked: the choice still applies for this visit */
  }
}

function effectiveTheme(): Theme {
  const chosen = root.dataset.theme
  if (chosen === 'light' || chosen === 'dark') return chosen
  return systemDark.matches ? 'dark' : 'light'
}

export const prefs = reactive({
  theme: effectiveTheme(),
  scale: Math.max(0, TEXT_SCALES.indexOf(Number(read(SCALE_KEY)) as (typeof TEXT_SCALES)[number])),
})

// Until the viewer picks a theme, keep following the system setting.
systemDark.addEventListener('change', () => (prefs.theme = effectiveTheme()))

export function toggleTheme() {
  const next: Theme = effectiveTheme() === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next
  write(THEME_KEY, next)
  prefs.theme = next
}

export function setScale(index: number) {
  prefs.scale = index
  root.style.fontSize = `${TEXT_SCALES[index] * 100}%`
  write(SCALE_KEY, String(TEXT_SCALES[index]))
}

