import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
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
  exerciseCompletionPct: 40,
  finishedAllExercises: 2,
  exercises: [{ id: 'hello-docker', title: 'Hello, Docker', completed: 8 }],
  quiz: { attempted: 4, passed: 3, takingNow: 2, averageBestPct: 80 },
  updatedAt: new Date().toISOString(),
}

describe('TrackerView quiz groups', () => {
  it('puts everyone in exactly one of four groups', async () => {
    state.content = structuredClone(content)
    vi.spyOn(api, 'stats').mockResolvedValue(structuredClone(stats))
    const wrapper = mount(TrackerView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(wrapper.find('.quiz-line').text().replace(/\s+/g, ' ')).toBe('3 passed, 1 trying again, 2 taking it now, 4 not started.')
    const widths = wrapper.findAll('.stacked span').map((s) => (s.element as HTMLElement).style.width)
    expect(widths).toEqual(['30%', '10%', '20%'])
    wrapper.unmount()
  })
})
