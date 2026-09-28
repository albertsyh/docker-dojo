import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ExercisesView from '../views/ExercisesView.vue'
import ExerciseView from '../views/ExerciseView.vue'
import TrackView from '../views/TrackView.vue'
import { state } from '../store'
import { content } from './content'

const stubs = { RouterLink: RouterLinkStub }
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
