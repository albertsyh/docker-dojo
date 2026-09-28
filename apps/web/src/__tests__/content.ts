import type { Content } from '../api'

/** A small, fixed stand-in for GET /api/content. */
export const content: Content = {
  language: 'en',
  exercises: [
    { id: 'hello-docker', title: 'Hello, Docker', minutes: 2, summary: 'First run.', steps: [{ text: 'Run it.', code: 'docker version', label: 'terminal' }], expected: 'Output.' },
    { id: 'volumes', title: 'Keep data with volumes', minutes: 5, summary: 'Volumes.', steps: [{ text: 'Make one.' }], expected: 'Data.' },
  ],
  quiz: { passMark: 0.7, minutes: 12, split: { easy: 4, medium: 3, advanced: 3 }, questionCount: 10 },
  takeHome: [
    {
      id: 'node',
      title: 'Take-home: Node.js',
      label: 'Node',
      summary: 'After the workshop.',
      exercises: [
        { id: 'node-first', title: 'A first Dockerfile', minutes: 7, summary: 'Start.', steps: [{ text: 'Build it.' }], expected: 'An image.' },
        { id: 'node-last', title: 'Clean up', minutes: 3, summary: 'End.', steps: [{ text: 'Remove it.' }], expected: 'Nothing left.' },
      ],
      quiz: { passMark: 0.7, minutes: 8, split: { easy: 3, medium: 2, advanced: 2 }, questionCount: 7 },
    },
  ],
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
  references: [
    {
      id: 'learn',
      title: 'Learning Docker',
      intro: 'Start with the first one.',
      links: [
        { title: 'Crash course', url: 'https://www.youtube.com/watch?v=abc', kind: 'video', source: 'A channel, 2023', note: 'Short.' },
        { title: 'About containers', url: 'https://learn.example.com/containers', kind: 'reading', source: 'Docs' },
      ],
    },
    {
      id: 'windows-server',
      title: 'Deploying on Windows Server',
      links: [{ title: 'Windows containers', url: 'https://www.youtube.com/watch?v=def', kind: 'video', source: '2024' }],
    },
  ],
  realtime: { key: 'test' },
}
