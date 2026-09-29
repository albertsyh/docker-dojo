import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CodeBlock from '../components/CodeBlock.vue'

describe('CodeBlock', () => {
  it('shows a diff as removed and added lines, with nothing to copy', () => {
    const code = ' export function greet(name) {\n-  return `Hello, ${name}!`\n+  return `Hi, ${name}!`\n }'
    const wrapper = mount(CodeBlock, { props: { code, label: 'greet.js', diff: true } })

    expect(wrapper.find('.code-label').text()).toBe('greet.js · change')
    expect(wrapper.find('del').element.textContent).toBe('  return `Hello, ${name}!`')
    expect(wrapper.find('ins').element.textContent).toBe('  return `Hi, ${name}!`')
    // The markers are drawn by CSS, so they never show up in the text.
    expect(wrapper.find('code').text()).not.toMatch(/^[-+]/m)
    expect(wrapper.findAll('.line')).toHaveLength(4)
    expect(wrapper.find('button.copy').exists()).toBe(false)
  })

  it('keeps the copy button on ordinary code', () => {
    const wrapper = mount(CodeBlock, { props: { code: 'docker build -t node-app .', label: 'terminal' } })

    expect(wrapper.find('button.copy').exists()).toBe(true)
    expect(wrapper.find('del').exists()).toBe(false)
  })
})
