// Downloads OpenPets pets and prepares them for the web app.
//
//   bun scripts/build-pets.ts                  # the default set below
//   bun scripts/build-pets.ts nori crumb       # specific catalog ids (first = default pet)
//
// For each pet it writes, into src/assets/pets/:
//   <id>.webp        the full spritesheet at half size (96x104 frames, 8 columns x 9 rows), WebP q90
//   <id>-thumb.webp  the first idle frame, for the pet picker
// and rewrites pets.json with names, descriptions and the frame count of every row.
// Requires ImageMagick (`magick`) and `unzip`. Only use pets you have permission to use,
// and credit them (see README "Credits").
import { $ } from 'bun'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_PETS = ['nori', 'crumb', 'fuse', 'professor-hoot']
const CATALOG = 'https://openpets.dev/pets/catalog.v2.json'
const COLS = 8
const ROWS = 9
const CELL_W = 192
const CELL_H = 208
const OUT = join(import.meta.dir, '../src/assets/pets')

type CatalogPet = { id: string; displayName: string; description: string; zip: string }

const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PETS
// curl, not fetch: Bun's fetch hung indefinitely on these downloads, while curl takes under a second.
const download = (url: string, to: string) => $`curl -fsSL --max-time 60 -o ${to} ${url}`

const catalog: { pets: CatalogPet[] } = JSON.parse(await $`curl -fsSL --max-time 60 ${CATALOG}`.text())
const manifest = []

for (const id of ids) {
  const pet = catalog.pets.find((p) => p.id === id)
  if (!pet) throw new Error(`"${id}" is not in the OpenPets catalog`)

  const dir = await mkdtemp(join(tmpdir(), `pet-${id}-`))
  try {
    await download(pet.zip, join(dir, 'pet.zip'))
    await $`unzip -q -o ${join(dir, 'pet.zip')} -d ${dir}`
    const sheet = join(dir, 'spritesheet.webp')

    const size = (await $`magick identify -format %wx%h ${sheet}`.text()).trim()
    if (size !== `${COLS * CELL_W}x${ROWS * CELL_H}`) throw new Error(`${id}: unexpected sheet size ${size}`)

    // Mean alpha of every cell, row by row: a cell with any pixels is a frame.
    const alphas = (await $`magick ${sheet} -alpha extract -crop ${CELL_W}x${CELL_H} +repage -format "%[fx:mean]\n" info:`.text())
      .trim()
      .split('\n')
      .map(Number)
    const rows = Array.from({ length: ROWS }, (_, r) => {
      const filled = alphas.slice(r * COLS, r * COLS + COLS).map((a) => a > 0.01)
      const count = filled.lastIndexOf(true) + 1
      if (filled.slice(0, count).includes(false)) throw new Error(`${id}: row ${r} has a gap between frames`)
      if (count === 0) throw new Error(`${id}: row ${r} is empty`)
      return count
    })

    // Nearest-pixel scaling keeps the pixel art sharp. Quality 90 (full-quality alpha) is
    // about a third of the lossless size and visually identical at this scale.
    await $`magick ${sheet} -filter point -resize 50% -quality 90 -define webp:alpha-quality=100 ${join(OUT, `${id}.webp`)}`
    await $`magick ${sheet} -crop ${CELL_W}x${CELL_H}+0+0 +repage -filter point -resize 50% -define webp:lossless=true ${join(OUT, `${id}-thumb.webp`)}`

    manifest.push({ id, name: pet.displayName, description: pet.description, rows })
    console.log(`${id}: rows ${rows.join(' ')}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

await Bun.write(join(OUT, 'pets.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`wrote ${manifest.length} pets to ${OUT}`)
