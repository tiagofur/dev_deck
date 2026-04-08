import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TagChip, hashIndex } from './TagChip'

describe('<TagChip>', () => {
  it('renders the label text', () => {
    render(<TagChip label="go" />)
    expect(screen.getByText('go')).toBeInTheDocument()
  })

  it('applies a tag color class', () => {
    render(<TagChip label="rust" colorIndex={1} />)
    const el = screen.getByText('rust')
    // We don't pin a specific color, just verify a known palette class is on it.
    const classes = el.className
    const hasPaletteClass = /bg-accent-(yellow|cyan|lime|lavender|orange)/.test(classes)
    expect(hasPaletteClass).toBe(true)
  })
})

describe('hashIndex', () => {
  it('is deterministic', () => {
    expect(hashIndex('go')).toBe(hashIndex('go'))
    expect(hashIndex('docker')).toBe(hashIndex('docker'))
  })

  it('returns different indices for different inputs', () => {
    const a = hashIndex('go')
    const b = hashIndex('rust')
    expect(a).not.toBe(b)
  })

  it('returns 0 for the empty string', () => {
    expect(hashIndex('')).toBe(0)
  })
})
