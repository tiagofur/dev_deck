import { describe, it, expect } from 'vitest'
import { calculateReputation, buildAchievements, REPUTATION_POINTS } from './reputation'

const t = (key: string) => key

describe('calculateReputation', () => {
  it('returns 0 for a brand new user', () => {
    expect(calculateReputation({ totalItems: 0, decksCount: 0, streakDays: 0 })).toBe(0)
  })

  it('weights items, decks, and streak days', () => {
    const expected =
      10 * REPUTATION_POINTS.item + 2 * REPUTATION_POINTS.deck + 3 * REPUTATION_POINTS.streakDay
    expect(calculateReputation({ totalItems: 10, decksCount: 2, streakDays: 3 })).toBe(expected)
  })
})

describe('buildAchievements', () => {
  it('always unlocks early_adopter', () => {
    const achievements = buildAchievements({ totalItems: 0, decksCount: 0, streakDays: 0 }, t)
    expect(achievements.find((a) => a.id === 'early_adopter')?.unlocked).toBe(true)
  })

  it('keeps threshold achievements locked below their thresholds', () => {
    const achievements = buildAchievements({ totalItems: 4, decksCount: 0, streakDays: 0 }, t)
    expect(achievements.find((a) => a.id === 'curator_master')?.unlocked).toBe(false)
    expect(achievements.find((a) => a.id === 'deck_builder')?.unlocked).toBe(false)
    expect(achievements.find((a) => a.id === 'flame_keeper')?.unlocked).toBe(false)
  })

  it('unlocks curator_master at 5 items, deck_builder at 1 deck, flame_keeper at 1 streak day', () => {
    const achievements = buildAchievements({ totalItems: 5, decksCount: 1, streakDays: 1 }, t)
    expect(achievements.find((a) => a.id === 'curator_master')?.unlocked).toBe(true)
    expect(achievements.find((a) => a.id === 'deck_builder')?.unlocked).toBe(true)
    expect(achievements.find((a) => a.id === 'flame_keeper')?.unlocked).toBe(true)
  })

  it('resolves descriptions through the translator', () => {
    const achievements = buildAchievements({ totalItems: 0, decksCount: 0, streakDays: 0 }, t)
    expect(achievements.map((a) => a.description)).toEqual([
      'profile.achievement_early_adopter_desc',
      'profile.achievement_curator_master_desc',
      'profile.achievement_deck_builder_desc',
      'profile.achievement_flame_keeper_desc'
    ])
  })
})
