// End-to-end checks against a running Docker Dojo stack, through nginx like a browser.
// Run with scripts/test-stack.sh, which starts a throwaway copy of the stack.
// It creates participants, so never point BASE_URL at a live workshop.
import { beforeAll, describe, expect, test } from 'bun:test'

const BASE = process.env.BASE_URL ?? 'http://localhost:8099'
const PROJECT = process.env.COMPOSE_PROJECT ?? 'docker-dojo-test'

type Content = { exercises: { id: string }[]; quiz: { questionCount: number }; glossary: unknown[]; references: unknown[]; realtime: { key: string } }
let content: Content

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, json: (await res.json().catch(() => null)) as any }
}

async function join() {
  const { json } = await api('GET', '/participants/suggestion')
  const res = await api('POST', '/participants', { id: json.id })
  expect(res.status).toBe(201)
  return json.id as string
}

/** Opens a Pusher-protocol websocket on a public channel and resolves with the next event of that name. */
function nextEvent(channel = 'tracker', name = 'stats.updated'): Promise<{ ready: Promise<void>; event: Promise<any>; close: () => void }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${BASE.replace('http', 'ws')}/app/${content.realtime.key}?protocol=7&client=js&version=8`)
    let subscribed: () => void
    let received: (data: any) => void
    const ready = new Promise<void>((r) => (subscribed = r))
    const event = new Promise<any>((r) => (received = r))
    ws.onopen = () => ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel } }))
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data))
      if (msg.event === 'pusher_internal:subscription_succeeded') subscribed()
      if (msg.event === name) received(JSON.parse(msg.data))
    }
    resolve({ ready, event, close: () => ws.close() })
  })
}

/** The api container migrates on start; waits until it answers through nginx. */
async function waitForApi() {
  for (let i = 0; i < 90; i++) {
    const res = await fetch(`${BASE}/api/content`).catch(() => null)
    if (res?.ok) return (await res.json()) as Content
    await Bun.sleep(1000)
  }
  throw new Error(`The stack at ${BASE} did not come up`)
}

beforeAll(async () => {
  content = await waitForApi()
}, 100_000)

describe('web (nginx)', () => {
  test('serves the app shell on every route, for client-side routing', async () => {
    for (const path of ['/', '/exercises/hello-docker', '/chat', '/glossary', '/references', '/live']) {
      const res = await fetch(BASE + path)
      expect(res.status).toBe(200)
      expect(await res.text()).toContain('<div id="app">')
    }
  })

  test('does not expose the Reverb HTTP API', async () => {
    // /apps/... is how servers publish events to Reverb. nginx must answer it itself.
    const post = await fetch(`${BASE}/apps/dojo/events`, { method: 'POST' })
    expect(post.status).toBe(405)
    expect(await post.text()).toContain('nginx')
    const get = await fetch(`${BASE}/apps/dojo/channels`)
    expect(await get.text()).toContain('<div id="app">')
  })
})

describe('api', () => {
  test('content has exercises, glossary, references and a quiz summary, but no questions', () => {
    expect(content.exercises.length).toBeGreaterThan(0)
    expect(content.glossary.length).toBeGreaterThan(0)
    expect(content.references.length).toBeGreaterThan(0)
    expect(content.quiz.questionCount).toBe(10)
    expect(JSON.stringify(content.quiz)).not.toContain('"answer"')
  })

  test('/api/exercises lists the ids through nginx, matching the content', async () => {
    const { status, json } = await api('GET', '/exercises')
    expect(status).toBe(200)
    expect(json.exercises.map((e: any) => e.id)).toEqual(content.exercises.map((e) => e.id))
    expect(json.exercises[0]).toMatchObject({ number: 1, live: `/live?embed&exercise=${content.exercises[0].id}` })
  })

  test('a student joins, completes an exercise and takes the quiz', async () => {
    const id = await join()
    const done = await api('PUT', `/participants/${id}/exercises/${content.exercises[0].id}`)
    expect(done.json.completed).toEqual([content.exercises[0].id])

    // A paper has no answers. Submitting it once grades it; the same paper cannot count twice.
    const paper = (await api('GET', `/participants/${id}/quiz`)).json
    expect(paper.questions).toHaveLength(content.quiz.questionCount)
    // Opening it puts this student under "taking it now" on the tracker.
    expect((await api('GET', '/stats')).json.quiz.takingNow).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(paper.questions)).not.toMatch(/"(answer|explanation)"/)
    const ids = paper.questions.map((q: any) => q.id)
    const answers = paper.questions.map((q: any) => (q.kind === 'blanks' ? Array(q.blanks).fill('x') : 0))
    const graded = await api('POST', `/participants/${id}/quiz`, { token: paper.token, questions: ids, answers })
    expect(graded.status).toBe(200)
    expect(graded.json.results).toHaveLength(ids.length)
    expect((await api('POST', `/participants/${id}/quiz`, { token: paper.token, questions: ids, answers })).status).toBe(409)

    // The next paper asks different questions.
    const next = (await api('GET', `/participants/${id}/quiz`)).json
    expect(next.questions.map((q: any) => q.id).filter((q: string) => ids.includes(q))).toEqual([])

    const resumed = await api('GET', `/participants/${id}`)
    expect(resumed.json.quiz).toMatchObject({ attempts: 1, total: content.quiz.questionCount })
  })

  test('the tracker counts who is on an exercise page, and the page can be framed', async () => {
    const id = await join()
    const here = async () => (await api('GET', '/stats')).json.exercises.find((e: any) => e.id === 'hello-docker').here
    expect((await api('POST', `/participants/${id}/presence`, { exercise: 'hello-docker' })).status).toBe(200)
    expect(await here()).toBeGreaterThanOrEqual(1)
    const before = await here()
    // What the browser's goodbye beacon sends when a tab closes.
    await fetch(`${BASE}/api/participants/${id}/presence`, { method: 'POST', body: new Blob([JSON.stringify({ exercise: null })], { type: 'application/json' }) })
    expect(await here()).toBe(before - 1)

    // /live?embed goes in an iframe on another site, so nothing may forbid framing.
    const res = await fetch(`${BASE}/live?embed`)
    expect(res.headers.get('x-frame-options')).toBeNull()
    expect(res.headers.get('content-security-policy') ?? '').not.toContain('frame-ancestors')
  })

  test('chat: a question is pushed to everyone, shown without the asker\'s id, and can be deleted', async () => {
    const id = await join()
    const socket = await nextEvent('chat', 'chat.updated')
    await socket.ready
    const posted = await api('POST', `/participants/${id}/chat`, { body: 'Why is port 8080 busy?', exercise: 'first-web-server' })
    expect(posted.status).toBe(201)
    const event = await Promise.race([socket.event, Bun.sleep(3000).then(() => null)])
    socket.close()
    // The event only says "changed": no message, no ids.
    expect(event).not.toBeNull()
    expect(Object.keys(event)).toEqual(['at'])

    const res = await fetch(`${BASE}/api/chat`)
    const raw = await res.text()
    expect(raw).toContain('Why is port 8080 busy?')
    expect(raw).not.toContain(id.slice(-6))
    const mine = posted.json.messages.find((m: any) => m.mine)
    expect(mine.author).toBe(id.split('-').slice(0, 2).join(' '))

    expect((await api('DELETE', `/participants/${id}/chat/${mine.id}`)).status).toBe(200)
    expect((await api('GET', '/chat')).json.messages.some((m: any) => m.id === mine.id)).toBe(false)
  })

  test('the live tracker gets a websocket update when someone makes progress', async () => {
    const socket = await nextEvent()
    await socket.ready
    const id = await join()
    const stats = await Promise.race([socket.event, Bun.sleep(3000).then(() => null)])
    socket.close()

    expect(stats).not.toBeNull()
    expect(stats.participants).toBeGreaterThan(0)
    const now = await api('GET', `/participants/${id}`)
    expect(now.status).toBe(200)
  })
})

describe('compose', () => {
  const inspect = (service: string) => {
    const out = Bun.spawnSync(['docker', 'compose', '-p', PROJECT, 'ps', '--format', 'json', service]).stdout.toString()
    return JSON.parse(out.trim().split('\n')[0])
  }

  test('only web publishes a port', () => {
    for (const service of ['db', 'api', 'reverb']) {
      const published = (inspect(service).Publishers ?? []).filter((p: any) => p.PublishedPort)
      expect(published).toEqual([])
    }
  })

  test('api and reverb run an image tagged for this project, not the main stack\'s', () => {
    for (const service of ['api', 'reverb']) expect(inspect(service).Image).toBe(`${PROJECT}-api`)
  })

  test('a quiz paper opened before an api restart can still be submitted', async () => {
    // Papers are signed with APP_KEY. With none set, the key must come back from the
    // app-key volume, not be regenerated, or every open paper breaks on restart.
    const id = await join()
    const paper = (await api('GET', `/participants/${id}/quiz`)).json
    expect(Bun.spawnSync(['docker', 'restart', inspect('api').ID]).exitCode).toBe(0)
    await waitForApi()

    const ids = paper.questions.map((q: any) => q.id)
    const answers = paper.questions.map((q: any) => (q.kind === 'blanks' ? Array(q.blanks).fill('x') : 0))
    expect((await api('POST', `/participants/${id}/quiz`, { token: paper.token, questions: ids, answers })).status).toBe(200)
  }, 120_000)

  test('every container has CPU and memory limits', () => {
    for (const service of ['db', 'api', 'reverb', 'web']) {
      const id = inspect(service).ID
      const [memory, cpus] = Bun.spawnSync(['docker', 'inspect', '-f', '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}', id]).stdout.toString().trim().split(' ')
      expect(Number(memory)).toBeGreaterThan(0)
      expect(Number(cpus)).toBeGreaterThan(0)
    }
  })
})
