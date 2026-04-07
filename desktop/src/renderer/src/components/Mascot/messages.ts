import type { MascotMood } from '../../features/stats/types'

/**
 * Mood-aware lines Snarkel can say. The `{lang}` token is replaced
 * with the user's top language at render time.
 *
 * Keep them short, casual, rioplatense — the mascot has personality.
 */
export const mascotMessages: Record<MascotMood, string[]> = {
  idle: [
    '¿Todo bien por acá?',
    '¿Algo nuevo para guardar?',
    'Acordate de revisar el modo descubrimiento',
    'Estoy acá si me necesitás',
  ],
  happy: [
    '¡Buenísimo!',
    'Me encanta',
    'Seguí así, hermano',
    'Buena racha',
  ],
  sleeping: [
    'Zzz... ah, volviste',
    'Hace banda que no aparecías',
    'Te extrañé',
    'Bienvenido de vuelta',
  ],
  judging: [
    'Otra vez {lang}, eh?',
    'Demasiado {lang}, dale',
    '¿Solo {lang}? Probá algo nuevo',
    'Mucho {lang} para mi gusto',
  ],
  celebrating: [
    '¡Otro más a la colección!',
    '¡Genial, agregá más!',
    'Crece la torre',
    '¡Eso es! Buenísimo',
  ],
}

export function pickMessage(mood: MascotMood, topLang: string | null): string {
  const list = mascotMessages[mood]
  const raw = list[Math.floor(Math.random() * list.length)]
  return raw.replace('{lang}', topLang ?? 'eso')
}
