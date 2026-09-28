// Renders apps/web/og/og-image.html to apps/web/public/og.png (1200x630), the link-preview image
// every page shares. Run after changing the source: bun scripts/og-image.ts
// Needs Chrome. Set CHROME to its binary if it is not in the usual macOS place.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const source = join(root, 'apps/web/og/og-image.html')
const out = join(root, 'apps/web/public/og.png')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(join(root, 'apps/web/node_modules/@fontsource-variable/figtree'))) {
  console.error('The fonts come from apps/web/node_modules. Run bun install in apps/web first.')
  process.exit(1)
}

const run = Bun.spawnSync([
  chrome, '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1200,630', '--virtual-time-budget=2000', `--screenshot=${out}`, `file://${source}`,
])
if (run.exitCode !== 0 || !existsSync(out)) {
  console.error(run.stderr.toString())
  process.exit(1)
}
console.log(`Wrote ${out}`)
