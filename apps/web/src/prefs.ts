import { reactive } from 'vue'

// Per-viewer display preferences. index.html applies the stored values before
// first paint; this module keeps them in sync afterwards.

export type Theme = 'light' | 'dark'
export const TEXT_SCALES = [1, 1.15, 1.3] as const

/** English is the default. Malay is standard Malay as written in Brunei; Docker terms stay English. */
export type Lang = 'en' | 'ms'
export const LANGUAGES: { code: Lang; name: string; html: string }[] = [
  { code: 'en', name: 'English', html: 'en' },
  { code: 'ms', name: 'Bahasa Melayu', html: 'ms-BN' },
]

const THEME_KEY = 'docker-dojo:theme'
const SCALE_KEY = 'docker-dojo:text-scale'
const LANG_KEY = 'docker-dojo:lang'
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

const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.code === value)
const savedLang = (): Lang => {
  const saved = read(LANG_KEY)
  return isLang(saved) ? saved : 'en'
}
// A lang= in the URL (after the # wins, like theme=) is read up front, so the first content
// request is already in that language. App.vue keeps it in step as the URL changes.
function urlLang(): Lang | null {
  const value = new URLSearchParams(location.hash.slice(1)).get('lang') ?? new URLSearchParams(location.search).get('lang')
  return isLang(value) ? value : null
}

export const prefs = reactive({
  theme: effectiveTheme(),
  scale: Math.max(0, TEXT_SCALES.indexOf(Number(read(SCALE_KEY)) as (typeof TEXT_SCALES)[number])),
  lang: urlLang() ?? savedLang(),
})

function applyLang(lang: Lang) {
  prefs.lang = lang
  root.lang = LANGUAGES.find((l) => l.code === lang)!.html
}
applyLang(prefs.lang)

/** The viewer's own choice: saved, like the theme. */
export function setLang(lang: Lang) {
  write(LANG_KEY, lang)
  applyLang(lang)
}

/** A lang= in the URL (for an embed) applies without being saved. Without one, the saved choice applies. */
export function setUrlLang(lang: string | null) {
  applyLang(isLang(lang) ? lang : savedLang())
}

// Until the viewer picks a theme, keep following the system setting.
systemDark.addEventListener('change', () => (prefs.theme = effectiveTheme()))

export function toggleTheme() {
  const next: Theme = effectiveTheme() === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next
  write(THEME_KEY, next)
  prefs.theme = next
}

// A theme in the URL (?theme=dark, or #theme=dark for an embed) applies without being saved, so it
// never changes the viewer's own choice. Without one, the saved choice or the system setting applies.
export function setUrlTheme(theme: string | null) {
  const saved = read(THEME_KEY)
  const next = theme === 'light' || theme === 'dark' ? theme : saved === 'light' || saved === 'dark' ? saved : null
  if (next) root.dataset.theme = next
  else delete root.dataset.theme
  prefs.theme = effectiveTheme()
}

export function setScale(index: number) {
  prefs.scale = index
  root.style.fontSize = `${TEXT_SCALES[index] * 100}%`
  write(SCALE_KEY, String(TEXT_SCALES[index]))
}

