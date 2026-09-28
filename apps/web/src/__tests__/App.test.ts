import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import App from '../App.vue'
import { state } from '../store'
import { content } from './content'

const Blank = defineComponent({ template: '<p>page</p>' })

async function renderApp() {
  state.loading = false
  state.content = structuredClone(content)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/exercises', '/quiz', '/glossary', '/live'].map((path) => ({ path, component: Blank })),
  })
  router.push('/')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  return { wrapper, router }
}

describe('App header', () => {
  it('links to every page, including the glossary', async () => {
    const { wrapper } = await renderApp()
    const links = wrapper.findAll('nav[aria-label="Main"] a').map((a) => a.attributes('href'))
    expect(links).toEqual(['/exercises', '/quiz', '/glossary', '/live'])
    wrapper.unmount()
  })

  it('menu button opens and closes the menu from its live state', async () => {
    const { wrapper } = await renderApp()
    const button = wrapper.find('button.menu-btn')
    const nav = wrapper.find('#main-nav')

    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(nav.classes()).toContain('open')
    await button.trigger('click')
    expect(nav.classes()).not.toContain('open')
    wrapper.unmount()
  })

  it('closes the menu on Escape and after navigating', async () => {
    const { wrapper, router } = await renderApp()
    const button = wrapper.find('button.menu-btn')

    await button.trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(button.attributes('aria-expanded')).toBe('false')

    await button.trigger('click')
    await router.push('/glossary')
    await flushPromises()
    expect(button.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('keeps the Menu button one width whichever label shows', async () => {
    const { wrapper } = await renderApp()
    // Both labels stay in the DOM (one hidden), so the button is sized to the wider one.
    const labels = wrapper.findAll('button.menu-btn > span')
    expect(labels.map((l) => l.text())).toEqual(['Menu', 'Close'])
    expect(labels.map((l) => l.attributes('aria-hidden'))).toEqual(['false', 'true'])
    wrapper.unmount()
  })
})
