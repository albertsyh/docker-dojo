import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ms from './locales/ms'
import { prefs } from './prefs'

// The app's own text. Course content (exercises, quiz, glossary, references) comes from the API,
// already in the chosen language. Malay is typed against English, so a missing key fails the build.
export type Messages = typeof en

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends Messages {}
}

export const i18n = createI18n({
  legacy: false,
  locale: prefs.lang,
  fallbackLocale: 'en',
  messages: { en, ms },
})

// In step with prefs.lang at once (sync), so text never renders in the previous language.
watch(
  () => prefs.lang,
  (lang) => (i18n.global.locale.value = lang),
  { flush: 'sync' },
)

/** For code outside components (store, api, toasts). */
export const t = i18n.global.t

/**
 * A code block's label as shown. The content keeps the English label, which also decides whether
 * a block is a shell (see CodeBlock.vue). File names stay as they are.
 */
export function codeLabel(label: string): string {
  if (label === 'terminal') return t('code.terminal')
  if (label === 'inside the container') return t('code.insideContainer')
  return label.replace(/ \(excerpt\)$/, () => ` (${t('code.excerpt')})`)
}

/** An exercise note's tag: operating systems stay as they are, "Tip" is translated. */
export const noteFor = (value: string) => (value === 'Tip' ? t('exercise.tip') : value)
