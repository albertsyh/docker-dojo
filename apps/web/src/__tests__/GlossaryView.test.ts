import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import GlossaryView from '../views/GlossaryView.vue'
import { state } from '../store'
import { content } from './content'

const render = () => mount(GlossaryView, { global: { stubs: { RouterLink: RouterLinkStub } } })

describe('GlossaryView', () => {
  beforeEach(() => {
    state.content = structuredClone(content)
  })

  it('lists every term under its topic', () => {
    const wrapper = render()
    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual(['The basics', 'Storage'])
    expect(wrapper.findAll('.term').map((t) => t.text())).toEqual(['Image', 'Container', 'Volume'])
    expect(wrapper.find('.count').text()).toBe('3 terms')
  })

  it('filters by term, alias and definition, ignoring case', async () => {
    const wrapper = render()
    const input = wrapper.find('input[type="search"]')

    await input.setValue('VOLUME')
    expect(wrapper.findAll('.term').map((t) => t.text())).toEqual(['Volume'])
    expect(wrapper.find('.count').text()).toBe('1 of 3 terms match')

    await input.setValue('-v')
    expect(wrapper.findAll('.term').map((t) => t.text())).toEqual(['Volume'])

    await input.setValue('running copy')
    expect(wrapper.findAll('.term').map((t) => t.text())).toEqual(['Container'])
    // Topics with no match disappear, and so do the topic links.
    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual(['The basics'])
    expect(wrapper.find('.topics').exists()).toBe(false)
  })

  it('shows a way out when nothing matches', async () => {
    const wrapper = render()
    await wrapper.find('input[type="search"]').setValue('kubernetes')
    expect(wrapper.text()).toContain('No terms match "kubernetes"')

    await wrapper.find('button.link').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.term')).toHaveLength(3)
  })

  it('links terms to the exercises that use them, skipping unknown ids', () => {
    const wrapper = render()
    const links = wrapper.findAllComponents(RouterLinkStub).filter((l) => String(l.props('to')).startsWith('/exercises/'))
    expect(links.map((l) => [l.props('to'), l.text()])).toEqual([
      ['/exercises/hello-docker', '1. Hello, Docker'],
      ['/exercises/hello-docker', '1. Hello, Docker'],
      ['/exercises/volumes', '2. Keep data with volumes'],
    ])
  })

  it('renders backticks as inline code', () => {
    const wrapper = render()
    expect(wrapper.find('dd code').text()).toBe('docker rm')
  })
})
