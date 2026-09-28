import { beforeEach, describe, expect, it, vi } from 'vitest'
import { choosePet, pet, PETS, petSurprise, togglePetShown, togglePicker } from '../pets'

describe('pets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    pet.id = 'nori'
    pet.row = 0
    pet.shown = true
    pet.pickerOpen = false
  })

  it('ships nori as the default plus the other pets', () => {
    expect(PETS[0].id).toBe('nori')
    expect(PETS.map((p) => p.id)).toEqual(expect.arrayContaining(['nori', 'crumb', 'fuse', 'professor-hoot']))
  })

  it('a click never repeats the idle or the current animation', () => {
    for (let i = 0; i < 200; i++) {
      const before = pet.row
      petSurprise()
      expect(pet.row).not.toBe(0)
      expect(pet.row).not.toBe(before)
    }
  })

  it('returns to idle after the animation plays', () => {
    petSurprise()
    expect(pet.row).not.toBe(0)
    vi.runAllTimers()
    expect(pet.row).toBe(0)
  })

  it('choosing a pet shows it again if it was hidden', () => {
    togglePetShown()
    expect(pet.shown).toBe(false)
    choosePet('fuse')
    expect(pet.id).toBe('fuse')
    expect(pet.shown).toBe(true)
  })

  it('the picker button toggles the picker', () => {
    togglePicker()
    expect(pet.pickerOpen).toBe(true)
    togglePicker()
    expect(pet.pickerOpen).toBe(false)
  })
})
