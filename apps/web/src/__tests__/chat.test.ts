import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import { api, type ChatMessage } from '../api'
import { chat, loadChat, toggleChat, unread } from '../chat'
import ChatPanel from '../components/ChatPanel.vue'
import PetCompanion from '../components/PetCompanion.vue'
import { pet } from '../pets'
import { state } from '../store'
import { content } from './content'

enableAutoUnmount(afterEach)

const ME = 'brave-otter-k3x9q2'
const msg = (id: number, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id, author: 'calm panda', body: `Question ${id}`, exercise: null, createdAt: '2026-09-28T10:00:00Z', meTooCount: 0, mine: false, meToo: false, ...over,
})

async function renderPanel(path = '/chat') {
  const Blank = defineComponent({ template: '<p />' })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/exercises/:id', component: Blank }, { path: '/:p(.*)*', component: Blank }] })
  router.push(path)
  await router.isReady()
  return mount(ChatPanel, { global: { plugins: [router] } })
}

beforeEach(() => {
  state.content = structuredClone(content)
  state.progress = { id: ME, completed: [], quiz: null, trackQuizzes: {} }
  Object.assign(chat, { messages: [], loaded: false, open: false, onPage: false, seenId: null })
  pet.pickerOpen = false
  pet.shown = true
  // Changing who is signed in refetches the chat. Never reach the network from a test.
  vi.spyOn(api, 'chatFor').mockResolvedValue({ messages: [] })
  vi.spyOn(api, 'chat').mockResolvedValue({ messages: [] })
})
afterEach(() => vi.restoreAllMocks())

describe('chat unread count', () => {
  it('treats history on a first visit as read, then counts new messages from others', async () => {
    vi.spyOn(api, 'chatFor').mockResolvedValue({ messages: [msg(1), msg(2)] })
    await loadChat()
    await flushPromises()
    expect(unread.value).toBe(0)

    vi.spyOn(api, 'chatFor').mockResolvedValue({ messages: [msg(1), msg(2), msg(3), msg(4, { mine: true })] })
    await loadChat()
    await flushPromises()
    // Your own message is never "new" to you.
    expect(unread.value).toBe(1)
  })

  it('opening the chat, or being on the chat page, marks everything read', async () => {
    chat.seenId = 1
    chat.loaded = true
    chat.messages = [msg(1), msg(2), msg(3)]
    await flushPromises()
    expect(unread.value).toBe(2)

    toggleChat()
    await flushPromises()
    expect(unread.value).toBe(0)
    toggleChat()

    chat.messages = [...chat.messages, msg(4)]
    await flushPromises()
    expect(unread.value).toBe(1)
    chat.onPage = true
    await flushPromises()
    expect(unread.value).toBe(0)
  })

  it('the chat popup and the pet picker share a corner, so one closes the other', async () => {
    toggleChat()
    expect(chat.open).toBe(true)
    pet.pickerOpen = true
    await flushPromises()
    expect(chat.open).toBe(false)
    toggleChat()
    expect(pet.pickerOpen).toBe(false)
  })
})

describe('ChatPanel', () => {
  it('shows authors by name, and you as "You"', async () => {
    chat.loaded = true
    chat.messages = [msg(1), msg(2, { author: 'brave otter', mine: true })]
    const wrapper = await renderPanel()
    expect(wrapper.findAll('.meta strong').map((s) => s.text())).toEqual(['calm panda', 'You'])
    // Me too on others' questions only; delete on your own only.
    expect(wrapper.findAll('.message')[0].find('.me-too').exists()).toBe(true)
    expect(wrapper.findAll('.message')[0].find('.delete').exists()).toBe(false)
    expect(wrapper.findAll('.message')[1].find('.me-too').exists()).toBe(false)
    expect(wrapper.findAll('.message')[1].find('.delete').exists()).toBe(true)
  })

  it('delete takes a second press, and the button keeps its width', async () => {
    vi.useFakeTimers()
    chat.messages = [msg(2, { mine: true })]
    const del = vi.spyOn(api, 'deleteChat').mockResolvedValue({ messages: [] })
    const wrapper = await renderPanel()
    const button = wrapper.find('.delete')
    expect(button.findAll('span[aria-hidden]').map((s) => s.text())).toEqual(['Delete', 'Yes, delete'])

    await button.trigger('click')
    expect(del).not.toHaveBeenCalled()
    expect(button.classes()).toContain('confirm')
    // The second press expires.
    vi.advanceTimersByTime(4000)
    await flushPromises()
    expect(button.classes()).not.toContain('confirm')

    await button.trigger('click')
    await button.trigger('click')
    await flushPromises()
    expect(del).toHaveBeenCalledWith(ME, 2)
    expect(chat.messages).toEqual([])
    vi.useRealTimers()
  })

  it('me too toggles and shows the count', async () => {
    chat.messages = [msg(1, { meTooCount: 2 })]
    const set = vi.spyOn(api, 'setMeToo').mockResolvedValue({ messages: [msg(1, { meTooCount: 3, meToo: true })] })
    const wrapper = await renderPanel()
    const button = wrapper.find('.me-too')
    expect(button.text()).toBe('Me too2')
    await button.trigger('click')
    await flushPromises()
    expect(set).toHaveBeenCalledWith(ME, 1, true)
    expect(wrapper.find('.me-too').attributes('aria-pressed')).toBe('true')
  })

  it('tags a question with the exercise page it was asked from', async () => {
    const post = vi.spyOn(api, 'postChat').mockResolvedValue({ messages: [msg(5, { mine: true, exercise: 'volumes' })] })
    const wrapper = await renderPanel('/exercises/volumes')
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('volumes')

    await wrapper.find('textarea').setValue('  Where did my data go?  ')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(post).toHaveBeenCalledWith(ME, 'Where did my data go?', 'volumes')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.find('.about').text()).toBe('2. Keep data with volumes')
  })

  it('Shift+Enter does not send, and blank questions are not sent', async () => {
    const post = vi.spyOn(api, 'postChat')
    const wrapper = await renderPanel()
    await wrapper.find('textarea').setValue('line one')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter', shiftKey: true })
    await wrapper.find('textarea').setValue('   ')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    expect(post).not.toHaveBeenCalled()
  })

  it('is read-only before joining', async () => {
    state.progress = null
    chat.loaded = true
    chat.messages = [msg(1, { mine: undefined, meToo: undefined })]
    const wrapper = await renderPanel()
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('.me-too').exists()).toBe(false)
    expect(wrapper.find('.join').text()).toContain('Get your name badge')
  })
})

describe('PetCompanion', () => {
  it('opens and closes the chat from its live state, with an unread badge', async () => {
    chat.loaded = true
    chat.seenId = 1
    chat.messages = [msg(1), msg(2)]
    const wrapper = mount(PetCompanion)
    const button = wrapper.find('button.pet')
    expect(wrapper.find('.unread').text()).toBe('1')
    expect(button.attributes('aria-label')).toContain('Open the questions chat, 1 new')

    await button.trigger('click')
    expect(chat.open).toBe(true)
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.unread').exists()).toBe(false)

    // Closed elsewhere (the popup's own close button): the pet's next press opens it again.
    chat.open = false
    await flushPromises()
    await button.trigger('click')
    expect(chat.open).toBe(true)
  })
})
