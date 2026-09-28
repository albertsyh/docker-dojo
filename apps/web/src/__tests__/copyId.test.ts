import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyId, toast, TOAST_MS } from '../clipboard'
import ToastHost from '../components/ToastHost.vue'
import HomeView from '../views/HomeView.vue'
import { state } from '../store'
import { content } from './content'

const ID = 'brave-otter-k3x9q2'
let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  toast.message = ''
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('copying your id', () => {
  it('copies and shows a notification that goes away by itself', async () => {
    const host = mount(ToastHost)
    await copyId(ID)
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(ID)
    expect(host.find('.toast').text()).toBe(`Copied your id: ${ID}`)
    expect(host.find('[role="status"]').exists()).toBe(true)

    vi.advanceTimersByTime(TOAST_MS)
    await flushPromises()
    expect(host.find('.toast').exists()).toBe(false)
    host.unmount()
  })

  it('still copies on a LAN address, where the Clipboard API is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    await copyId(ID)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(toast.message).toBe(`Copied your id: ${ID}`)
    // The helper textarea is cleaned up.
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('the name badge on the home page copies your id', async () => {
    state.content = structuredClone(content)
    state.progress = { id: ID, completed: [], quiz: null, trackQuizzes: {} }
    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    const badge = wrapper.find('button.badge')
    expect(badge.attributes('aria-label')).toBe(`Copy your id, ${ID}`)
    await badge.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(ID)
    expect(toast.message).toBe(`Copied your id: ${ID}`)
    wrapper.unmount()
  })
})
