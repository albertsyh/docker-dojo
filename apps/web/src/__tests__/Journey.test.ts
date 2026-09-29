import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import ExercisesView from '../views/ExercisesView.vue'
import ExerciseView from '../views/ExerciseView.vue'
import TrackView from '../views/TrackView.vue'
import { state } from '../store'
import { content } from './content'

const stubs = { RouterLink: RouterLinkStub }
// Views left mounted would keep sending presence when a later test changes state.progress.
enableAutoUnmount(afterEach)
const links = (wrapper: ReturnType<typeof mount>) => wrapper.findAllComponents(RouterLinkStub).map((l) => String(l.props('to')))

describe('take-home tracks in the journey', () => {
  beforeEach(() => {
    state.content = structuredClone(content)
    state.progress = { id: 'brave-otter-abc123', completed: ['hello-docker', 'node-first'], quiz: null, trackQuizzes: { node: null } }
  })

  it('the exercise list counts the workshop only, and lists each track below it', async () => {
    const wrapper = mount(ExercisesView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('.lead').text()).toContain('1 of 2 done')
    // One "you are here", on the workshop's next exercise.
    expect(wrapper.findAll('.tag.here')).toHaveLength(1)
    expect(wrapper.find('li.here').text()).toContain('Keep data with volumes')
    const track = wrapper.find('.tracks li')
    expect(track.text()).toContain('Take-home: Node.js')
    expect(track.find('.tag').text()).toBe('Node')
    expect(track.find('.meta').text()).toBe('2 exercises · about 10 minutes · 1 of 2 done')
    expect(links(wrapper)).toContain('/take-home/node')
  })

  it("a track page shows its own journey, ending in its own quiz", async () => {
    const wrapper = mount(TrackView, { props: { track: 'node' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Take-home: Node.js')
    expect(wrapper.findAll('.journey li')).toHaveLength(3)
    expect(wrapper.find('li.here').text()).toContain('Clean up')
    expect(links(wrapper)).toContain('/take-home/node/quiz')
  })

  it('an unknown track says so', async () => {
    const wrapper = mount(TrackView, { props: { track: 'cobol' }, global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain("That track doesn't exist.")
  })

  it("a take-home exercise steps through its own track, and ends at that track's quiz", async () => {
    const wrapper = mount(ExerciseView, { props: { id: 'node-last' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.findAll('.stepper .seg')).toHaveLength(2)
    expect(wrapper.find('.meta').text()).toContain('Node')
    expect(wrapper.find('.meta').text()).toContain('Exercise 2 of 2')
    expect(links(wrapper)).toEqual(expect.arrayContaining(['/take-home/node', '/exercises/node-first', '/take-home/node/quiz']))
    expect(links(wrapper)).not.toContain('/quiz')
  })

  it('the last workshop exercise still ends at the workshop quiz', async () => {
    const wrapper = mount(ExerciseView, { props: { id: 'volumes' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.findAll('.stepper .seg')).toHaveLength(2)
    expect(links(wrapper)).toContain('/quiz')
    expect(links(wrapper)).not.toContain('/take-home/node/quiz')
  })
})

describe('an embedded exercise (/exercises/<id>?embed)', () => {
  beforeEach(() => {
    state.content = structuredClone(content)
    state.content.exercises[0].files = { entries: [{ path: 'my-site/Dockerfile' }] }
  })

  it('shows only the steps, without joining', async () => {
    state.progress = null
    const wrapper = mount(ExerciseView, { props: { id: 'hello-docker', embed: true }, global: { stubs } })
    await flushPromises()

    expect(wrapper.find('.steps').text()).toContain('Run it.')
    expect(wrapper.find('.steps').text()).toContain('docker version')
    expect(wrapper.find('.gate').exists()).toBe(false)
    for (const gone of ['.intro', '.summary', '.side', '.expected', '.actions']) expect(wrapper.find(gone).exists()).toBe(false)
    expect(links(wrapper)).toEqual([])
  })

  it("doesn't count a joined student as here now", async () => {
    const presence = vi.spyOn(api, 'presence').mockResolvedValue({ exercise: null })
    state.progress = { id: 'brave-otter-abc123', completed: [], quiz: null, trackQuizzes: {} }
    mount(ExerciseView, { props: { id: 'hello-docker', embed: true }, global: { stubs } })
    await flushPromises()

    expect(presence).not.toHaveBeenCalled()
    presence.mockRestore()
  })
})

describe('an exercise that carries on from earlier ones', () => {
  beforeEach(() => {
    state.content = structuredClone(content)
    state.content.exercises.push({ id: 'networks', title: 'Let containers talk', minutes: 8, summary: 'Talk.', requires: ['hello-docker', 'volumes'], steps: [{ text: 'Connect.' }], expected: 'Visits.' })
    state.progress = { id: 'brave-otter-abc123', completed: ['hello-docker'], quiz: null, trackQuizzes: {} }
  })

  it('links each one, and says which are not done yet', async () => {
    const wrapper = mount(ExerciseView, { props: { id: 'networks' }, global: { stubs } })
    await flushPromises()

    const box = wrapper.find('.requires')
    expect(box.text()).toContain('Finish the ones not done yet first.')
    const items = box.findAll('li')
    expect(items.map((li) => li.findComponent(RouterLinkStub).props('to'))).toEqual(['/exercises/hello-docker', '/exercises/volumes'])
    expect(items[0].text()).toBe('1. Hello, DockerDone')
    expect(items[1].text()).toBe('2. Keep data with volumesNot done yet')
  })

  it('stops asking once they are all done', async () => {
    state.progress!.completed.push('volumes')
    const wrapper = mount(ExerciseView, { props: { id: 'networks' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.find('.requires').text()).not.toContain('Finish the ones not done yet first.')
    expect(wrapper.find('.requires').text()).not.toContain('Not done yet')
  })

  it('an exercise without requires, or an embed, shows no box', async () => {
    expect(mount(ExerciseView, { props: { id: 'volumes' }, global: { stubs } }).find('.requires').exists()).toBe(false)
    expect(mount(ExerciseView, { props: { id: 'networks', embed: true }, global: { stubs } }).find('.requires').exists()).toBe(false)
  })
})

describe('the done exercises at the top fold away', () => {
  const ids = ['one', 'two', 'three', 'four', 'five', 'six']
  beforeEach(() => {
    localStorage.clear()
    state.content = structuredClone(content)
    state.content.exercises = ids.map((id) => ({ id, title: `Exercise ${id}`, minutes: 5, summary: '.', steps: [{ text: '.' }], expected: '.' }))
    // four done in a row, five not yet, six done out of order
    state.progress = { id: 'brave-otter-abc123', completed: ['one', 'two', 'three', 'four', 'six'], quiz: null, trackQuizzes: {} }
  })
  const titles = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('.stop strong').map((s) => s.text())

  it('folds the leading run into a stack of three ticks and a count, keeping one done out of order', async () => {
    const wrapper = mount(ExercisesView, { global: { stubs } })
    await flushPromises()

    const fold = wrapper.find('.fold-toggle')
    expect(fold.attributes('aria-expanded')).toBe('false')
    expect(fold.text()).toContain('4 exercises done')
    expect(fold.findAll('.stack .node')).toHaveLength(3)
    expect(fold.find('.more').text()).toBe('+1')
    expect(titles(wrapper)).toEqual(['Exercise five', 'Exercise six', 'Quiz'])
  })

  it('opens and closes from the same button, and remembers it', async () => {
    const wrapper = mount(ExercisesView, { global: { stubs } })
    await flushPromises()

    await wrapper.find('.fold-toggle').trigger('click')
    expect(wrapper.find('.fold-toggle').attributes('aria-expanded')).toBe('true')
    expect(titles(wrapper)).toEqual([...ids.map((id) => `Exercise ${id}`), 'Quiz'])
    expect(localStorage.getItem('docker-dojo:journey-open')).toBe('1')

    await wrapper.find('.fold-toggle').trigger('click')
    expect(titles(wrapper)).toEqual(['Exercise five', 'Exercise six', 'Quiz'])
    expect(localStorage.getItem('docker-dojo:journey-open')).toBe('0')
  })

  it('does not fold fewer than three', async () => {
    state.progress!.completed = ['one', 'two']
    const wrapper = mount(ExercisesView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('.fold').exists()).toBe(false)
    expect(titles(wrapper)).toHaveLength(ids.length + 1)
  })
})
