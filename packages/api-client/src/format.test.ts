import { describe, it, expect } from 'vitest'
import { formatCount } from './format'

describe('formatCount', () => {
  it('returns the raw value below 1000', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(42)).toBe('42')
    expect(formatCount(999)).toBe('999')
  })

  it('formats thousands with one decimal and a "k" suffix', () => {
    expect(formatCount(1_000)).toBe('1.0k')
    expect(formatCount(1_500)).toBe('1.5k')
    expect(formatCount(28_400)).toBe('28.4k')
  })

  it('formats millions with one decimal and an "M" suffix', () => {
    expect(formatCount(1_000_000)).toBe('1.0M')
    expect(formatCount(2_500_000)).toBe('2.5M')
  })
})
