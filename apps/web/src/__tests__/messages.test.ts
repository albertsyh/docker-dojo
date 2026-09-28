import { describe, expect, it } from 'vitest'
import en from '../locales/en'
import ms from '../locales/ms'

// Every source file, as text. A key that doesn't exist would show on the page as the key itself.
const sources = import.meta.glob(['../**/*.{vue,ts}', '!../__tests__/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const has = (messages: unknown, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages) !== undefined

/** Every key path in a message tree, leaves only. */
const keys = (node: unknown, prefix = ''): string[] =>
  node && typeof node === 'object' ? Object.entries(node).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k)) : [prefix]

describe('messages', () => {
  it('every key the code asks for exists', () => {
    const missing: string[] = []
    for (const [file, text] of Object.entries(sources)) {
      // t('a.b'), te('a.b'), and keypath="a.b" on <i18n-t>. Keys built at runtime (`a.${x}`) are not checked here.
      for (const [, key] of text.matchAll(/\bte?\(\s*'([a-zA-Z][\w.-]*)'/g)) if (!has(en, key)) missing.push(`${file}: ${key}`)
      for (const [, key] of text.matchAll(/keypath="([\w.-]+)"/g)) if (!has(en, key)) missing.push(`${file}: ${key}`)
    }
    expect(missing).toEqual([])
  })

  it('Malay has every English message, with the same placeholders', () => {
    const placeholders = (text: unknown) => [...new Set([...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort()
    const get = (messages: unknown, key: string) => key.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], messages)
    for (const key of keys(en)) {
      expect(has(ms, key), key).toBe(true)
      expect(placeholders(get(ms, key)), key).toEqual(placeholders(get(en, key)))
    }
  })

  it('no em-dashes in either language', () => {
    for (const messages of [en, ms]) {
      for (const key of keys(messages)) expect(String(key.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], messages)), key).not.toContain('—')
    }
  })
})
