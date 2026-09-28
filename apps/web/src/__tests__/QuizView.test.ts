import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, type QuizPaper, type QuizResult } from '../api'
import QuizView from '../views/QuizView.vue'
import { state } from '../store'
import { content } from './content'

const paper: QuizPaper = {
  token: 'a'.repeat(64),
  questions: [
    { kind: 'choice', id: 'e1', level: 'easy', prompt: 'What is a container?', options: ['A', 'B', 'C', 'D'] },
    { kind: 'blanks', id: 'm1', level: 'medium', context: 'Run nginx in the background.', prompt: 'Fill in the blanks.', label: 'terminal', code: 'docker run {{1}} -p {{2}} nginx', blanks: 2 },
    { kind: 'choice', id: 'a1', level: 'advanced', scenario: 'shop', prompt: 'Which port?', options: ['80', '8080', '3306', '6379'] },
    { kind: 'choice', id: 'a2', level: 'advanced', scenario: 'shop', prompt: 'Which host?', options: ['db', 'localhost', 'api', 'web'] },
  ],
  scenarios: [{ id: 'shop', title: 'An online shop', intro: 'Four services.', label: 'compose.yaml', code: 'services:\n  web:\n    image: nginx' }],
}

const graded: QuizResult = {
  score: 3,
  total: 4,
  passed: true,
  results: [
    { questionId: 'e1', chosen: 1, answer: 1, correct: true, explanation: 'Right.' },
    { questionId: 'm1', chosen: ['-d', '80:8080'], answer: ['-d', '8080:80'], correct: false, blankCorrect: [true, false], explanation: 'Host port first.' },
    { questionId: 'a1', chosen: 1, answer: 1, correct: true, explanation: 'Published port.' },
    { questionId: 'a2', chosen: 0, answer: 0, correct: true, explanation: 'Service name.' },
  ],
  progress: { id: 'brave-otter-abc123', completed: [], quiz: { bestScore: 3, total: 4, passed: true, attempts: 1 }, trackQuizzes: {} },
}

async function render() {
  const wrapper = mount(QuizView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  return wrapper
}

describe('QuizView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    state.content = structuredClone(content)
    state.progress = { id: 'brave-otter-abc123', completed: [], quiz: null, trackQuizzes: {} }
    vi.spyOn(api, 'quizPaper').mockResolvedValue(structuredClone(paper))
    window.scrollTo = vi.fn()
  })

  it('groups questions by level and shows the compose file once', async () => {
    const wrapper = await render()

    expect(wrapper.findAll('.section-head h2').map((h) => h.text())).toEqual(['Easy', 'Medium: fill in the blanks', 'Advanced: read a compose file'])
    expect(wrapper.findAll('.scenario')).toHaveLength(1)
    expect(wrapper.find('.scenario').text()).toContain('An online shop')
    expect(wrapper.findAll('.qnum').map((n) => n.text())).toEqual(['1', '2', '3', '4'])
    expect(wrapper.find('.context').text()).toBe('Run nginx in the background.')
    expect(wrapper.findAll('input.blank')).toHaveLength(2)
  })

  it('waits until every question and every blank is answered', async () => {
    const wrapper = await render()
    const submit = wrapper.find('button[type="submit"]')

    await wrapper.find('input[name="e1"][value="1"]').setValue()
    await wrapper.find('input[name="a1"][value="1"]').setValue()
    await wrapper.find('input[name="a2"][value="0"]').setValue()
    await wrapper.find('input[name="m1-1"]').setValue('-d')
    await wrapper.find('input[name="m1-2"]').setValue('   ')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('3 of 4 answered')

    await wrapper.find('input[name="m1-2"]').setValue('80:8080')
    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('sends the answers in paper order and shows what was missed', async () => {
    const submitQuiz = vi.spyOn(api, 'submitQuiz').mockResolvedValue(structuredClone(graded))
    const wrapper = await render()

    await wrapper.find('input[name="e1"][value="1"]').setValue()
    await wrapper.find('input[name="m1-1"]').setValue('-d')
    await wrapper.find('input[name="m1-2"]').setValue('80:8080')
    await wrapper.find('input[name="a1"][value="1"]').setValue()
    await wrapper.find('input[name="a2"][value="0"]').setValue()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // No track: the workshop quiz.
    expect(submitQuiz).toHaveBeenCalledWith('brave-otter-abc123', expect.objectContaining({ token: paper.token }), [1, ['-d', '80:8080'], 1, 0], undefined)
    expect(wrapper.find('.score-num').text()).toContain('3')
    expect(wrapper.find('.missed').text()).toBe('Blank 2: you wrote 80:8080, the answer is 8080:80.')
    expect(wrapper.find('input[name="m1-1"]').classes()).toContain('ok')
    expect(wrapper.find('input[name="m1-2"]').classes()).toContain('bad')
  })

  it('a new quiz fetches a fresh paper', async () => {
    vi.spyOn(api, 'submitQuiz').mockResolvedValue(structuredClone(graded))
    const wrapper = await render()
    ;(wrapper.vm as unknown as { result: QuizResult }).result = structuredClone(graded)
    await flushPromises()

    await wrapper.find('.score-actions button').trigger('click')
    await flushPromises()
    expect(api.quizPaper).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.score').exists()).toBe(false)
  })
})

describe('QuizView for a take-home track', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    state.content = structuredClone(content)
    state.progress = { id: 'brave-otter-abc123', completed: [], quiz: null, trackQuizzes: { node: null } }
    vi.spyOn(api, 'quizPaper').mockResolvedValue(structuredClone(paper))
    window.scrollTo = vi.fn()
  })

  it("fetches and submits that track's quiz, and points back to the track", async () => {
    const submitQuiz = vi.spyOn(api, 'submitQuiz').mockResolvedValue(structuredClone(graded))
    const wrapper = mount(QuizView, { props: { track: 'node' }, global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    expect(api.quizPaper).toHaveBeenCalledWith('brave-otter-abc123', 'node')
    expect(wrapper.find('h1').text()).toBe('Quiz: Node track')
    expect(wrapper.find('.lead').text()).toContain('7 questions: 3 easy, 2 fill in the blanks')

    await wrapper.find('input[name="e1"][value="1"]').setValue()
    await wrapper.find('input[name="m1-1"]').setValue('-d')
    await wrapper.find('input[name="m1-2"]').setValue('80:8080')
    await wrapper.find('input[name="a1"][value="1"]').setValue()
    await wrapper.find('input[name="a2"][value="0"]').setValue()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(submitQuiz).toHaveBeenCalledWith('brave-otter-abc123', expect.anything(), expect.anything(), 'node')
    expect(wrapper.findAllComponents(RouterLinkStub).map((l) => l.props('to'))).toContain('/take-home/node')
  })

  it('an unknown track says so instead of fetching a paper', async () => {
    const wrapper = mount(QuizView, { props: { track: 'cobol' }, global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    expect(api.quizPaper).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("That quiz doesn't exist.")
  })
})

describe('QuizView check-in', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    state.content = structuredClone(content)
    state.progress = { id: 'brave-otter-abc123', completed: [], quiz: null, trackQuizzes: {} }
    vi.spyOn(api, 'quizPaper').mockResolvedValue(structuredClone(paper))
    window.scrollTo = vi.fn()
  })

  it('checks in every 2 minutes while a quiz is open, and stops once submitted', async () => {
    const progress = vi.spyOn(api, 'progress').mockResolvedValue(state.progress!)
    vi.spyOn(api, 'submitQuiz').mockResolvedValue(structuredClone(graded))
    const wrapper = await render()

    vi.advanceTimersByTime(119_000)
    expect(progress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000)
    expect(progress).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(120_000)
    expect(progress).toHaveBeenCalledTimes(2)

    ;(wrapper.vm as unknown as { result: QuizResult }).result = structuredClone(graded)
    await flushPromises()
    vi.advanceTimersByTime(600_000)
    expect(progress).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    vi.useRealTimers()
  })
})
