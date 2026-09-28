// Checks what `docker compose config` makes of compose.yaml and compose.prod.yaml.
// It never starts anything, and never reads the repo's .env (--env-file /dev/null).
import { describe, expect, test } from 'bun:test'

const ROOT = `${import.meta.dir}/..`
const SECRETS = {
  APP_KEY: 'base64:test',
  APP_URL: 'https://dojo.test',
  DB_PASSWORD: 'db-secret',
  DB_ROOT_PASSWORD: 'root-secret',
  REVERB_APP_KEY: 'reverb-key',
  REVERB_APP_SECRET: 'reverb-secret',
  CLOUDFLARE_TUNNEL_TOKEN: 'tunnel-token',
}

function config(files: string[], env: Record<string, string> = {}) {
  const args = ['docker', 'compose', '--env-file', '/dev/null', ...files.flatMap((f) => ['-f', f]), 'config', '--format', 'json']
  // A clean environment, so secrets exported in the caller's shell can't make a test pass.
  const out = Bun.spawnSync(args, { cwd: ROOT, env: { PATH: process.env.PATH!, HOME: process.env.HOME!, ...env } })
  return { code: out.exitCode, stderr: out.stderr.toString(), json: out.exitCode === 0 ? JSON.parse(out.stdout.toString()) : null }
}

const PROD = ['compose.yaml', 'compose.prod.yaml']

describe('compose.yaml (local)', () => {
  test('runs with no .env at all', () => {
    expect(config(['compose.yaml']).code).toBe(0)
  })

  test('api and reverb share an image tagged by project, and the app-key volume', () => {
    const { services } = config(['compose.yaml']).json
    expect(services.api.image).toBe('docker-dojo-api')
    expect(services.reverb.image).toBe(services.api.image)
    for (const s of ['api', 'reverb']) expect(services[s].volumes.map((v: any) => v.source)).toContain('appkey')
    // Another project name gets its own image, so a throwaway copy never retags this one.
    const other = Bun.spawnSync(['docker', 'compose', '--env-file', '/dev/null', '-p', 'other', 'config', '--format', 'json'], { cwd: ROOT })
    expect(JSON.parse(other.stdout.toString()).services.api.image).toBe('other-api')
  })

  test('APP_URL follows APP_PORT', () => {
    expect(config(['compose.yaml'], { APP_PORT: '9123' }).json.services.api.environment.APP_URL).toBe('http://localhost:9123')
  })
})

describe('compose.prod.yaml', () => {
  test('refuses to start without every secret', () => {
    for (const missing of Object.keys(SECRETS)) {
      const env = { ...SECRETS } as Record<string, string>
      delete env[missing]
      const res = config(PROD, env)
      expect(res.code, `should fail without ${missing}`).not.toBe(0)
      expect(res.stderr).toContain(missing)
    }
  })

  test('uses the real secrets, never the local defaults', () => {
    const { json } = config(PROD, SECRETS)
    expect(JSON.stringify(json)).not.toContain('dojo-local')
    expect(json.services.api.environment.APP_KEY).toBe(SECRETS.APP_KEY)
    expect(json.services.reverb.environment.REVERB_APP_SECRET).toBe(SECRETS.REVERB_APP_SECRET)
    expect(json.services.db.environment.MYSQL_ROOT_PASSWORD).toBe(SECRETS.DB_ROOT_PASSWORD)
  })

  test('publishes no ports: the tunnel is the only way in', () => {
    const { services } = config(PROD, SECRETS).json
    for (const [name, s] of Object.entries<any>(services)) expect(s.ports ?? [], name).toEqual([])
    expect(services.cloudflared.environment.TUNNEL_TOKEN).toBe(SECRETS.CLOUDFLARE_TUNNEL_TOKEN)
  })

  test('nginx trusts CF-Connecting-IP in prod only', () => {
    const mounted = (s: any) => (s.volumes ?? []).map((v: any) => v.target)
    expect(mounted(config(PROD, SECRETS).json.services.web)).toContain('/etc/nginx/conf.d/real-ip.conf')
    expect(mounted(config(['compose.yaml']).json.services.web)).not.toContain('/etc/nginx/conf.d/real-ip.conf')
  })
})
