import type { Content } from '../api'

/** A small, fixed stand-in for GET /api/content. */
export const content: Content = {
  exercises: [
    { id: 'hello-docker', title: 'Hello, Docker', minutes: 2, summary: 'First run.', steps: [{ text: 'Run it.', code: 'docker version', label: 'terminal' }], expected: 'Output.' },
    { id: 'volumes', title: 'Keep data with volumes', minutes: 5, summary: 'Volumes.', steps: [{ text: 'Make one.' }], expected: 'Data.' },
  ],
  quiz: { passMark: 0.7, minutes: 12, split: { easy: 4, medium: 3, advanced: 3 }, questionCount: 10 },
  glossary: [
    {
      id: 'basics',
      title: 'The basics',
      terms: [
        { term: 'Image', text: 'A read-only template.', seenIn: ['hello-docker'] },
        { term: 'Container', text: 'A running copy of an image.', seenIn: ['hello-docker', 'not-an-exercise'] },
      ],
    },
    {
      id: 'storage',
      title: 'Storage',
      terms: [{ term: 'Volume', aka: '-v', text: 'Storage that survives `docker rm`.', seenIn: ['volumes'] }],
    },
  ],
  realtime: { key: 'test' },
}
