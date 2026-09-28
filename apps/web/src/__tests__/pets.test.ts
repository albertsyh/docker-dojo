import { beforeEach, describe, expect, it, vi } from 'vitest'
import { choosePet, pet, petReact, PETS, togglePetShown, togglePicker } from '../pets'

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

  it('returns to idle after the animation plays', () => {
    petReact('wave')
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
