import { describe, it, expect } from 'vitest'
import { EnrichmentStatus } from '../../index'

describe('EnrichmentStatus', () => {
  it('should have the correct values', () => {
    expect(EnrichmentStatus.Pending).toBe('pending')
    expect(EnrichmentStatus.Queued).toBe('queued')
    expect(EnrichmentStatus.Ok).toBe('ok')
    expect(EnrichmentStatus.Error).toBe('error')
    expect(EnrichmentStatus.Skipped).toBe('skipped')
  })
})
