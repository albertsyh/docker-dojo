import { reactive } from 'vue'
import manifest from './assets/pets/pets.json'

// Pets come from OpenPets (see README "Credits"); scripts/build-pets.ts generates
// the sheets, thumbnails and pets.json. Every sheet is 8 columns x 9 rows of 96x104 frames.
const urls = import.meta.glob('./assets/pets/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export type Pet = { id: string; name: string; description: string; rows: number[]; sheet: string; thumb: string }

export const PETS: Pet[] = manifest.map((p) => ({
  ...p,
  sheet: urls[`./assets/pets/${p.id}.webp`],
  thumb: urls[`./assets/pets/${p.id}-thumb.webp`],
}))

export const FRAME_W = 96
export const FRAME_H = 104

/** Row numbers in every OpenPets sheet. Rows 1-2 walk right/left; 6-8 are extra moods. */
const ROW = { idle: 0, wave: 3, jump: 4, sad: 5 } as const

export type Reaction = 'wave' | 'jump' | 'sad'

const PET_ID_KEY = 'docker-dojo:pet-id'
const PET_SHOWN_KEY = 'docker-dojo:pet'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage blocked: the choice still applies for this visit */
  }
}

const storedId = read(PET_ID_KEY)

export const pet = reactive({
  id: PETS.some((p) => p.id === storedId) ? storedId! : PETS[0].id,
  shown: read(PET_SHOWN_KEY) !== 'hidden',
  pickerOpen: false,
  row: ROW.idle as number,
  /** Changes on every animation so it restarts even when the row repeats. */
  seq: 0,
})

export const currentPet = () => PETS.find((p) => p.id === pet.id) ?? PETS[0]

/** Milliseconds per frame, and how often a one-off animation repeats before idling again. */
export const FRAME_MS = 130
export const IDLE_FRAME_MS = 200
const playsFor = (frames: number) => (frames <= 5 ? 2 : 1)

let timer: number | undefined

function play(row: number) {
  const frames = currentPet().rows[row]
  pet.row = row
  pet.seq++
  clearTimeout(timer)
  timer = window.setTimeout(() => {
    pet.row = ROW.idle
    pet.seq++
  }, frames * FRAME_MS * playsFor(frames))
}

export function animationFor(row: number) {
  const frames = currentPet().rows[row]
  const idle = row === ROW.idle
  return { frames, duration: frames * (idle ? IDLE_FRAME_MS : FRAME_MS), iterations: idle ? Infinity : playsFor(frames) }
}

export function petReact(reaction: Reaction) {
  play(ROW[reaction])
}

/** On click: any animation except idle and whatever is playing now. */
export function petSurprise() {
  const choices = currentPet()
    .rows.map((_, row) => row)
    .filter((row) => row !== ROW.idle && row !== pet.row)
  play(choices[Math.floor(Math.random() * choices.length)])
}

export function choosePet(id: string) {
  pet.id = id
  write(PET_ID_KEY, id)
  if (!pet.shown) togglePetShown()
  petReact('wave')
}

export function togglePetShown() {
  pet.shown = !pet.shown
  write(PET_SHOWN_KEY, pet.shown ? 'shown' : 'hidden')
}

export function togglePicker() {
  pet.pickerOpen = !pet.pickerOpen
}
