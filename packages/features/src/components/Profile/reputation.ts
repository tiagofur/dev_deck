import type { Achievement } from './ReputationDashboard'

export interface ReputationInputs {
  totalItems: number
  decksCount: number
  streakDays: number
}

export const REPUTATION_POINTS = {
  item: 5,
  deck: 15,
  streakDay: 50
} as const

export function calculateReputation({ totalItems, decksCount, streakDays }: ReputationInputs): number {
  return (
    totalItems * REPUTATION_POINTS.item +
    decksCount * REPUTATION_POINTS.deck +
    streakDays * REPUTATION_POINTS.streakDay
  )
}

export function buildAchievements(
  { totalItems, decksCount, streakDays }: ReputationInputs,
  t: (key: string) => string
): Achievement[] {
  return [
    {
      id: 'early_adopter',
      title: 'Early Adopter',
      description: t('profile.achievement_early_adopter_desc'),
      icon: '🚀',
      unlocked: true,
      color: 'bg-accent-yellow'
    },
    {
      id: 'curator_master',
      title: 'Curator Master',
      description: t('profile.achievement_curator_master_desc'),
      icon: '🛡️',
      unlocked: totalItems >= 5,
      color: 'bg-accent-cyan'
    },
    {
      id: 'deck_builder',
      title: 'Deck Builder',
      description: t('profile.achievement_deck_builder_desc'),
      icon: '🏗️',
      unlocked: decksCount >= 1,
      color: 'bg-accent-pink'
    },
    {
      id: 'flame_keeper',
      title: 'Flame Keeper',
      description: t('profile.achievement_flame_keeper_desc'),
      icon: '🔥',
      unlocked: streakDays >= 1,
      color: 'bg-accent-lime'
    }
  ]
}
