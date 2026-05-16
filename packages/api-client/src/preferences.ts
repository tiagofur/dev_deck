// User preferences persisted in localStorage.
//
// Same subscribe pattern as toast/confirm: components subscribe and
// re-render when preferences change.
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'devdeck.prefs.v1'

export interface Preferences {
  mascotEnabled: boolean
  clientId: string
  lastSyncAt: string | null
  activeOrgId: string | null
}

const defaults: Preferences = {
  mascotEnabled: true,
  clientId: '',
  lastSyncAt: null,
  activeOrgId: null,
}

export function getPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : {}
    const prefs = { ...defaults, ...parsed }
    
    // Ensure clientId exists
    if (!prefs.clientId) {
      prefs.clientId = uuidv4()
      setPreferences({ clientId: prefs.clientId })
    }
    
    return prefs
  } catch {
    return { ...defaults, clientId: uuidv4() }
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
