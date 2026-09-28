import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ReferencesView from '../views/ReferencesView.vue'
import { state } from '../store'
import { content } from './content'

const render = () => mount(ReferencesView, { global: { stubs: { RouterLink: RouterLinkStub } } })

describe('ReferencesView', () => {
  beforeEach(() => {
    state.content = structuredClone(content)
  })

  it('lists every link under its topic, with a topic link to each section', () => {
    const wrapper = render()
    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual(['Learning Docker', 'Deploying on Windows Server'])
    expect(wrapper.findAll('section').map((s) => s.attributes('id'))).toEqual(['learn', 'windows-server'])
    expect(wrapper.findAllComponents(RouterLinkStub).map((l) => l.props('to'))).toEqual([{ hash: '#learn' }, { hash: '#windows-server' }])
    expect(wrapper.findAll('a.title').map((a) => a.attributes('href'))).toEqual([
      'https://www.youtube.com/watch?v=abc',
      'https://learn.example.com/containers',
      'https://www.youtube.com/watch?v=def',
    ])
  })

  it('opens links in a new tab without handing over the opener', () => {
    for (const a of render().findAll('a.title')) {
      expect(a.attributes('target')).toBe('_blank')
      expect(a.attributes('rel')).toContain('noopener')
      expect(a.text()).toContain('(opens in a new tab)')
    }
  })

  it('says who made each link and where it goes', () => {
    const wrapper = render()
    expect(wrapper.findAll('.meta').map((m) => m.text())).toEqual([
      'A channel, 2023 · youtube.com',
      'Docs · learn.example.com',
      '2024 · youtube.com',
    ])
    expect(wrapper.findAll('.kind .sr-only').map((s) => s.text())).toEqual(['Video:', 'Reading:', 'Video:'])
    // Notes and intros are optional.
    expect(wrapper.findAll('.note')).toHaveLength(1)
    expect(wrapper.findAll('.intro')).toHaveLength(1)
  })
})
