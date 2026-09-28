import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echo: Echo<'reverb'> | null = null

/**
 * Reverb speaks the Pusher protocol. nginx in the web container forwards
 * /app/* to Reverb, so we connect back to whatever host served this page.
 */
export function getEcho(key: string): Echo<'reverb'> {
  if (echo) return echo
  const secure = location.protocol === 'https:'
  const port = Number(location.port) || (secure ? 443 : 80)
  echo = new Echo({
    broadcaster: 'reverb',
    key,
    Pusher,
    wsHost: location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: ['ws', 'wss'],
  })
  return echo
}
