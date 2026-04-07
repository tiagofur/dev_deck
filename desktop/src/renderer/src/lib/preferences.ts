// User preferences persisted in localStorage.
//
// Same subscribe pattern as toast/confirm: components subscribe and
// re-render when preferences change.
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'devdeck.prefs.v1'

export interface Preferences {
  mascotEnabled: boolean
}

const defaults: Preferences = {
  mascotEnabled: true,
}

export function getPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return { ...defaults, ...parsed }
  } catch {
    return { ...defaults }
  }
}

type Listener = (p: Preferences) => void
let listeners: Listener[] = []

function emit(p: Preferences): void {
  for (const l of listeners) l(p)
}

export function setPreferences(patch: Partial<Preferences>): void {
  const next = { ...getPreferences(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* swallow — preferences are best-effort */
  }
  emit(next)
}

export function subscribePreferences(listener: Listener): () => void {
  listeners = [...listeners, listener]
  listener(getPreferences())
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

/** Hook helper for components. */
export function usePreferences(): Preferences {
  const [prefs, setPrefs] = useState<Preferences>(getPreferences)
  useEffect(() => subscribePreferences(setPrefs), [])
  return prefs
}
