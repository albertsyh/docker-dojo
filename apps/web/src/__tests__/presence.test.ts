import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { api } from '../api'
import { PRESENCE_MS, usePresence } from '../presence'
import { state } from '../store'

const where = ref<string | null>('hello-docker')
const Page = defineComponent({ setup: () => (usePresence(() => where.value), () => h('p')) })

// A failed assertion must not leave a page mounted to leak calls into the next test.
enableAutoUnmount(afterEach)

describe('usePresence', () => {
  let presence: MockInstance<typeof api.presence>
  let beacon: MockInstance<typeof api.presenceBeacon>

  beforeEach(() => {
    vi.useFakeTimers()
    state.progress = { id: 'brave-otter-k3x9q2', completed: [], quiz: null, trackQuizzes: {} }
    where.value = 'hello-docker'
    presence = vi.spyOn(api, 'presence').mockResolvedValue({ exercise: null })
    beacon = vi.spyOn(api, 'presenceBeacon').mockReturnValue(true)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const calls = () => presence.mock.calls.map((c) => c[1])

  it('checks in on arrival and every minute after, hidden tab or not', async () => {
    const wrapper = mount(Page)
    expect(calls()).toEqual(['hello-docker'])
    vi.advanceTimersByTime(PRESENCE_MS * 3)
    expect(calls()).toEqual(['hello-docker', 'hello-docker', 'hello-docker', 'hello-docker'])
    wrapper.unmount()
  })

  it('moves to the next exercise and says goodbye on leaving', async () => {
    const wrapper = mount(Page)
    where.value = 'volumes'
    await flushPromises()
    wrapper.unmount()
    expect(calls()).toEqual(['hello-docker', 'volumes', null])
    // No heartbeat after leaving.
    vi.advanceTimersByTime(PRESENCE_MS * 2)
    expect(calls()).toHaveLength(3)
  })

  it('sends a beacon when the tab closes', () => {
    const wrapper = mount(Page)
    window.dispatchEvent(new Event('pagehide'))
    expect(beacon).toHaveBeenCalledWith('brave-otter-k3x9q2', null)
    wrapper.unmount()
  })

  it('does nothing before the student has joined', () => {
    state.progress = null
    const wrapper = mount(Page)
    vi.advanceTimersByTime(PRESENCE_MS)
    wrapper.unmount()
    expect(presence).not.toHaveBeenCalled()
  })
})
