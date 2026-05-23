import React from 'react'
import { Library, Briefcase, Flame, Sparkles, Trophy, Check } from 'lucide-react'
import { useTranslation } from '@devdeck/i18n'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  color: string
}

export interface ReputationDashboardProps {
  totalItems: number
  decksCount: number
  streakDays: number
  reputation: number
  achievements: Achievement[]
}

export function ReputationDashboard({
  totalItems,
  decksCount,
  streakDays,
  reputation,
  achievements
}: ReputationDashboardProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      {/* Stats Dashboard Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-accent-lavender border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
          <span className="font-mono text-3xl font-black">{decksCount}</span>
          <span className="font-display font-bold text-xs uppercase text-ink/65 flex items-center gap-1.5">
            <Library size={14} />
            {t('profile.decks_count')}
          </span>
        </div>

        <div className="bg-accent-cyan border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
          <span className="font-mono text-3xl font-black">{totalItems}</span>
          <span className="font-display font-bold text-xs uppercase text-ink/65 flex items-center gap-1.5">
            <Briefcase size={14} />
            {t('profile.tips_count')}
          </span>
        </div>

        <div className="bg-accent-lime border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
          <span className="font-mono text-3xl font-black flex items-center gap-1">
            {streakDays}
            <Flame className="text-accent-pink fill-accent-pink animate-pulse" size={24} />
          </span>
          <span className="font-display font-bold text-xs uppercase text-ink/65">
            {t('profile.streak_days')}
          </span>
        </div>

        <div className="bg-accent-yellow border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
          <span className="font-mono text-3xl font-black flex items-center gap-1">
            {reputation}
            <Sparkles size={20} className="text-accent-pink animate-spin-slow" />
          </span>
          <span className="font-display font-bold text-xs uppercase text-ink/65">
            {t('profile.reputation')}
          </span>
        </div>
      </section>

      {/* Curation Achievements / Badges */}
      <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
        <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
          <Trophy size={20} strokeWidth={3} className="text-accent-yellow" />
          {t('profile.achievements')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`border-2 border-ink p-3 shadow-hard-sm flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-300
                         ${ach.unlocked ? `${ach.color} bg-opacity-100` : 'bg-bg-primary bg-opacity-40 filter grayscale opacity-50'}`}
            >
              <span className="text-3xl mb-2">{ach.icon}</span>
              <div>
                <h4 className="font-display font-black text-[11px] uppercase tracking-wide leading-tight">
                  {ach.title}
                </h4>
                <p className="text-[8px] font-mono mt-1 text-ink/75 leading-tight">
                  {ach.description}
                </p>
              </div>
              {ach.unlocked && (
                <div className="absolute top-1 right-1 border border-ink bg-white p-0.5 rounded-none flex items-center justify-center">
                  <Check size={8} strokeWidth={4} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
