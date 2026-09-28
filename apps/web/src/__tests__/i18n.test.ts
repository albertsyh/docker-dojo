import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { api, type Content, type QuizPaper, type Stats } from '../api'
import App from '../App.vue'
import CodeBlock from '../components/CodeBlock.vue'
import { prefs, setLang } from '../prefs'
import { state } from '../store'
import QuizView from '../views/QuizView.vue'
import TrackerView from '../views/TrackerView.vue'
import { content } from './content'

vi.mock('../realtime', () => ({
  getEcho: () => ({
    channel: () => ({ listen: () => {} }),
    leaveChannel: () => {},
    connector: { pusher: { connection: { state: 'connected', bind: () => {}, unbind: () => {} } } },
  }),
}))

const Blank = defineComponent({ template: '<p>page</p>' })
const malay: Content = {
  ...structuredClone(content),
  language: 'ms',
  exercises: content.exercises.map((e) => ({ ...e, title: `MS ${e.title}` })),
}

async function renderApp(path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/exercises', '/quiz', '/chat', '/glossary', '/references', '/live'].map((p) => ({ path: p, component: Blank })),
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

const navText = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('nav[id="main-nav"] a').map((a) => a.text())

describe('language', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    state.loading = false
    state.content = structuredClone(content)
    vi.spyOn(api, 'content').mockImplementation(async () => structuredClone(prefs.lang === 'ms' ? malay : content))
  })
  afterEach(async () => {
    setLang('en')
    await flushPromises()
    localStorage.removeItem('docker-dojo:lang')
    state.content = null
  })

  it('the switch changes the app text and html lang, remembers the choice, and fetches the content again', async () => {
    const { wrapper } = await renderApp()
    expect(navText(wrapper)).toContain('Exercises')
    expect(document.documentElement.lang).toBe('en')

    const buttons = wrapper.findAll('.foot .langs button')
    expect(buttons.map((b) => b.text())).toEqual(['English', 'Bahasa Melayu'])
    await buttons[1].trigger('click')
    await flushPromises()

    expect(navText(wrapper)).toContain('Latihan')
    expect(document.documentElement.lang).toBe('ms-BN')
    expect(localStorage.getItem('docker-dojo:lang')).toBe('ms')
    expect(buttons[1].attributes('aria-pressed')).toBe('true')
    expect(state.content?.exercises[0].title).toBe('MS Hello, Docker')
    wrapper.unmount()
  })

  it('a slower answer for a language already left behind is thrown away', async () => {
    let answer: (c: Content) => void = () => {}
    vi.spyOn(api, 'content').mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    setLang('ms')
    await flushPromises()
    setLang('en')
    await flushPromises()
    answer(structuredClone(malay))
    await flushPromises()

    expect(state.content?.exercises[0].title).toBe('Hello, Docker')
  })

  it('lang= in the URL applies without replacing the saved choice', async () => {
    const { wrapper, router } = await renderApp()
    await router.push('/live?embed#lang=ms')
    await flushPromises()
    expect(prefs.lang).toBe('ms')
    expect(localStorage.getItem('docker-dojo:lang')).toBeNull()

    await router.push('/live?embed')
    await flushPromises()
    expect(prefs.lang).toBe('en')
    wrapper.unmount()
  })

  it('asks the API in the chosen language, and English needs no parameter', async () => {
    vi.restoreAllMocks()
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    await api.progress('brave-otter-abc123')
    setLang('ms')
    await api.progress('brave-otter-abc123')

    const calls = fetch.mock.calls.map((c) => String(c[0])).filter((url) => url.includes('/participants/'))
    expect(calls).toEqual(['/api/participants/brave-otter-abc123', '/api/participants/brave-otter-abc123?lang=ms'])
  })

  it('a code block shows its label in Malay but stays a shell block', async () => {
    setLang('ms')
    const wrapper = mount(CodeBlock, { props: { code: 'ls', label: 'inside the container' } })
    expect(wrapper.find('.code').classes()).toContain('shell')
    expect(wrapper.find('.code-label').text()).toBe('di dalam container')
    await wrapper.setProps({ label: 'compose.yaml (excerpt)' })
    expect(wrapper.find('.code-label').text()).toBe('compose.yaml (petikan)')
  })

  it('switching language mid-quiz swaps the questions and keeps the paper and the answers', async () => {
    const paper: QuizPaper = {
      token: 'a'.repeat(64),
      questions: [{ kind: 'choice', id: 'e1', level: 'easy', prompt: 'What is a container?', options: ['A', 'B', 'C', 'D'] }],
      scenarios: [],
    }
    state.progress = { id: 'brave-otter-abc123', completed: [], quiz: null, trackQuizzes: {} }
    vi.spyOn(api, 'quizPaper').mockResolvedValue(structuredClone(paper))
    const swap = vi.spyOn(api, 'quizQuestions').mockResolvedValue({
      questions: [{ kind: 'choice', id: 'e1', level: 'easy', prompt: 'Apakah container?', options: ['A', 'B', 'C', 'D'] }],
      scenarios: [],
    })
    const submit = vi.spyOn(api, 'submitQuiz')
    const wrapper = mount(QuizView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.findAll('input[type="radio"]')[2].setValue(true)

    setLang('ms')
    await flushPromises()

    expect(swap).toHaveBeenCalledWith('brave-otter-abc123', ['e1'], undefined)
    expect(wrapper.find('legend').text()).toContain('Apakah container?')
    expect((wrapper.findAll('input[type="radio"]')[2].element as HTMLInputElement).checked).toBe(true)
    await wrapper.find('form').trigger('submit')
    expect(submit.mock.calls[0][1].token).toBe(paper.token)
    expect(submit.mock.calls[0][2]).toEqual([2])
    state.progress = null
    wrapper.unmount()
  })

  it('the Live page shows titles in the viewer\'s language, though the stats are English', async () => {
    const stats: Stats = {
      participants: 2, activeNow: 1, activeWindowMinutes: 5, hereWindowMinutes: 3, exerciseCompletionPct: 0, finishedAllExercises: 0,
      exercises: content.exercises.map((e) => ({ id: e.id, title: e.title, completed: 0, here: 0 })),
      takeHome: [], quiz: { attempted: 0, passed: 0, takingNow: 0, averageBestPct: null }, updatedAt: new Date().toISOString(),
    }
    vi.spyOn(api, 'stats').mockResolvedValue(stats)
    setLang('ms')
    await flushPromises()
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/live', component: TrackerView }] })
    router.push('/live')
    await router.isReady()
    const wrapper = mount(TrackerView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.findAll('.ladder li .ex-name').map((n) => n.text())).toEqual(['MS Hello, Docker', 'MS Keep data with volumes'])
    expect(wrapper.find('#ex-title').text()).toBe('Latihan')
    wrapper.unmount()
  })
})
