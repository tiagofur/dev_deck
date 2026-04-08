export type MascotMood =
  | 'idle'
  | 'happy'
  | 'sleeping'
  | 'judging'
  | 'celebrating'

export interface Stats {
  total_repos: number
  total_archived: number
  top_language: string | null
  top_language_share: number
  last_added_at: string | null
  last_open_at: string | null
  streak_days: number
  mascot_mood: MascotMood
}
