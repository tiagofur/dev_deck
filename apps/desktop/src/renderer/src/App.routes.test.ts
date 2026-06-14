import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(resolve(here, 'App.tsx'), 'utf8')

describe('desktop route parity', () => {
  it('registers Circles routes exported by shared features', () => {
    expect(appSource).toContain('CirclesPage')
    expect(appSource).toContain('CircleDetailPage')
    expect(appSource).toContain('CircleJoinPage')
    expect(appSource).toContain('path="/circles"')
    expect(appSource).toContain('path="/circles/:id"')
    expect(appSource).toContain('path="/circles/join/:inviteCode"')
  })

  it('has a catch-all 404 route so unknown paths never render blank', () => {
    expect(appSource).toContain('path="*"')
    expect(appSource).toContain('NotFoundPage')
  })
})
