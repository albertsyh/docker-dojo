import { reactive } from 'vue'
import { t } from './i18n'

/** Copies text. The Clipboard API needs https or localhost; on a LAN address it falls back to a hidden textarea. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

/** One short notification at a time, shown by ToastHost.vue. seq restarts it when the same message repeats. */
export const toast = reactive({ message: '', seq: 0 })
export const TOAST_MS = 2500
let timer: number | undefined

export function notify(message: string) {
  toast.message = message
  toast.seq++
  clearTimeout(timer)
  timer = window.setTimeout(() => (toast.message = ''), TOAST_MS)
}

/** Click-to-copy for the participant id, wherever it is shown. */
export async function copyId(id: string) {
  await copyText(id)
  notify(t('toast.copiedId', { id }))
}
