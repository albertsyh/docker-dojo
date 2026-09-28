import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { DOC, render } from '../scripts/exercise-ids'

// Needs no running stack: bun test tests/docs.test.ts
describe('docs', () => {
  test('docs/exercise-ids.md matches exercises.json (run bun scripts/exercise-ids.ts to update)', () => {
    expect(readFileSync(DOC, 'utf8')).toBe(render())
  })
})
