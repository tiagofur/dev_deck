import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getPreferences, setPreferences, subscribePreferences } from './preferences'

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when storage is empty', () => {
    const p = getPreferences()
    expect(p.mascotEnabled).toBe(true)
  })

  it('persists changes via setPreferences', () => {
    setPreferences({ mascotEnabled: false })
    expect(getPreferences().mascotEnabled).toBe(false)
    // And it survives a fresh read.
    const raw = localStorage.getItem('devdeck.prefs.v1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toMatchObject({ mascotEnabled: false })
  })

  it('falls back to defaults when stored JSON is corrupt', () => {
    localStorage.setItem('devdeck.prefs.v1', '{ not json')
    const p = getPreferences()
    expect(p.mascotEnabled).toBe(true)
  })

  it('notifies subscribers on change and on initial subscribe', () => {
    const fn = vi.fn()
    const unsubscribe = subscribePreferences(fn)
    // Initial call with current prefs.
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ mascotEnabled: true }))

    setPreferences({ mascotEnabled: false })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ mascotEnabled: false }))

    unsubscribe()
    setPreferences({ mascotEnabled: true })
    // Still 2 — unsubscribed listeners stop receiving.
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
