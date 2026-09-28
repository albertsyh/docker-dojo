import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { api, type Stats } from '../api'
import TrackerView from '../views/TrackerView.vue'
import { state } from '../store'
import { content } from './content'

vi.mock('../realtime', () => ({
  getEcho: () => ({
    channel: () => ({ listen: () => {} }),
    leaveChannel: () => {},
    connector: { pusher: { connection: { state: 'connected', bind: () => {}, unbind: () => {} } } },
  }),
}))

const stats: Stats = {
  participants: 10,
  activeNow: 6,
  activeWindowMinutes: 5,
  hereWindowMinutes: 3,
  exerciseCompletionPct: 40,
  finishedAllExercises: 2,
  exercises: [
    { id: 'hello-docker', title: 'Hello, Docker', completed: 8, here: 0 },
    { id: 'volumes', title: 'Keep data with volumes', completed: 0, here: 3 },
  ],
  quiz: { attempted: 4, passed: 3, takingNow: 2, averageBestPct: 80 },
  takeHome: [
    {
      id: 'node',
      title: 'Take-home: Node.js',
      label: 'Node',
      exercises: [
        { id: 'node-first', title: 'A first Dockerfile', completed: 2, here: 1 },
        { id: 'node-last', title: 'Clean up', completed: 0, here: 0 },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
}

async function render(path = '/live', s: Stats = stats) {
  const { wrapper } = await renderWithRouter(path, s)
  return wrapper
}

async function renderWithRouter(path = '/live', s: Stats = stats) {
  const spy = vi.spyOn(api, 'stats').mockResolvedValue(structuredClone(s))
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/live', component: TrackerView }] })
  router.push(path)
  await router.isReady()
  const wrapper = mount(TrackerView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router, spy }
}

describe('TrackerView', () => {
  beforeEach(() => {
    state.content = structuredClone(content)
  })

  it('puts everyone in exactly one of four quiz groups', async () => {
    const wrapper = await render()
    expect(wrapper.find('.quiz-line').text().replace(/\s+/g, ' ')).toBe('3 passed, 1 trying again, 2 taking it now, 4 not started.')
    const widths = wrapper.findAll('.stacked span').map((s) => (s.element as HTMLElement).style.width)
    expect(widths).toEqual(['30%', '10%', '20%'])
    wrapper.unmount()
  })

  it('shows who is on each exercise now, and a quiet zero where nothing is done', async () => {
    const wrapper = await render()
    const rows = wrapper.findAll('.ladder li')
    expect(rows[0].find('.here-pill').exists()).toBe(false)
    expect(rows[1].find('.here-pill').text()).toBe('3 here now')
    expect(rows[0].find('.ex-count').text()).toBe('8 · 80%')
    expect(rows[1].find('.ex-count').text()).toBe('0 done')
    // Titles wrap instead of being cut off.
    expect(rows[1].find('.ex-name').text()).toBe('Keep data with volumes')
    wrapper.unmount()
  })

  it('explains an empty board instead of a wall of zeros', async () => {
    const empty = { ...stats, exerciseCompletionPct: 0, finishedAllExercises: 0, exercises: stats.exercises.map((e) => ({ ...e, completed: 0 })) }
    const wrapper = await render('/live', empty)
    expect(wrapper.find('.sub').text()).toContain('Nobody has ticked off an exercise yet')
    expect(wrapper.find('.ladder').classes()).toContain('quiet')
    expect(wrapper.text()).not.toContain('0% of all exercises done')
    wrapper.unmount()
  })

  it('?exercise narrows to that exercise and its neighbours, keeping their numbers', async () => {
    const many: Stats = {
      ...stats,
      exercises: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, title: id.toUpperCase(), completed: 0, here: 0 })),
    }
    const shown = async (query: string) => {
      const wrapper = await render(`/live?embed&${query}`, many)
      const result = {
        nums: wrapper.findAll('.ladder li .ex-num').map((n) => n.text()).join(','),
        current: wrapper.find('.ladder li.current .ex-name').text(),
        sub: wrapper.findAll('.sub').map((p) => p.text()).join(' '),
      }
      wrapper.unmount()
      return result
    }

    expect(await shown('exercise=c')).toEqual({ nums: '2,3,4', current: 'C', sub: expect.stringContaining('Showing 2 to 4 of 6.') })
    // Shifted in at the ends, so there are still three.
    expect((await shown('exercise=a')).nums).toBe('1,2,3')
    expect((await shown('exercise=f')).nums).toBe('4,5,6')
    expect((await shown('exercise=c&count=5')).nums).toBe('1,2,3,4,5')
    expect((await shown('exercise=c&count=1')).nums).toBe('3')
    // Nonsense counts fall back to 3, and huge ones to the whole list.
    expect((await shown('exercise=c&count=abc')).nums).toBe('2,3,4')
    expect((await shown('exercise=c&count=99')).nums).toBe('1,2,3,4,5,6')
  })

  it('#exercise works like ?exercise, and a new # moves the list without reloading', async () => {
    const many: Stats = {
      ...stats,
      exercises: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, title: id.toUpperCase(), completed: 0, here: 0 })),
    }
    const { wrapper, router, spy } = await renderWithRouter('/live?embed#exercise=c&count=1', many)
    const nums = () => wrapper.findAll('.ladder li .ex-num').map((n) => n.text()).join(',')
    expect(nums()).toBe('3')
    const fetches = spy.mock.calls.length

    // What an iframe host does: change only the part after the #.
    await router.push('/live?embed#exercise=f')
    await flushPromises()
    expect(nums()).toBe('4,5,6')
    expect(wrapper.find('.ladder li.current .ex-name').text()).toBe('F')
    // Same page, same stats: nothing was fetched again.
    expect(spy.mock.calls.length).toBe(fetches)

    // With both, the # wins.
    await router.push('/live?embed&exercise=a#exercise=d&count=1')
    await flushPromises()
    expect(nums()).toBe('4')
    wrapper.unmount()
  })

  it('an unknown ?exercise shows everything and says so', async () => {
    const wrapper = await render('/live?embed&exercise=nope')
    expect(wrapper.findAll('.ladder li')).toHaveLength(2)
    expect(wrapper.find('.ladder li.current').exists()).toBe(false)
    expect(wrapper.text()).toContain('There is no exercise called "nope", so this shows them all.')
    wrapper.unmount()
  })

  it('lists take-home tracks in their own section, apart from the workshop', async () => {
    const wrapper = await render()
    const section = wrapper.find('.take-home')
    expect(section.find('h3').text()).toContain('Take-home: Node.js')
    expect(section.findAll('.ladder li .ex-name').map((n) => n.text())).toEqual(['A first Dockerfile', 'Clean up'])
    expect(section.find('.ladder li .ex-count').text()).toBe('2 · 20%')
    // The workshop list above is unchanged.
    expect(wrapper.findAll('.grid .ladder li')).toHaveLength(2)
    wrapper.unmount()
  })

  it('?exercise with a take-home id narrows that track instead', async () => {
    const wrapper = await render('/live?embed&exercise=node-last&count=1')
    expect(wrapper.find('#ex-title').text()).toBe('Take-home: Node.js')
    expect(wrapper.findAll('.ladder li .ex-num').map((n) => n.text())).toEqual(['2'])
    expect(wrapper.find('.ladder li.current .ex-name').text()).toBe('Clean up')
    expect(wrapper.text()).toContain('Showing 2 to 2 of 2.')
    wrapper.unmount()
  })

  it('embed mode shows only exercise progress', async () => {
    const wrapper = await render('/live?embed')
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.quiz').exists()).toBe(false)
    expect(wrapper.find('.take-home').exists()).toBe(false)
    expect(wrapper.findAll('.ladder li')).toHaveLength(2)
    expect(wrapper.find('.headline').exists()).toBe(true)
    wrapper.unmount()
  })
})
