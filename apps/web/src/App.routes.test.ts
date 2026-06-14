import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read App.tsx as source so this stays fast and free of the heavy runtime
// (sqlite/local-db) the real app boots. It guards route reachability — every
// page the app advertises must actually be wired into the router.
const here = dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(resolve(here, 'App.tsx'), 'utf8')

describe('web router', () => {
  const protectedRoutes = [
    '/items',
    '/items/:id',
    '/repos',
    '/repo/:id',
    '/onboarding',
    '/discovery',
    '/profile',
    '/settings',
    '/workbench',
    '/cheatsheets',
    '/cheatsheets/:id',
    '/runbooks',
    '/circles',
    '/circles/:id',
    '/circles/join/:inviteCode',
    '/review',
    '/feed',
    '/following',
    '/admin',
    '/capture-share',
  ]

  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/explore',
    '/deck/:slug',
    '/waitlist',
    '/u/:username',
  ]

  it.each(protectedRoutes)('registers protected route %s', (path) => {
    expect(appSource).toContain(`path="${path}"`)
  })

  it.each(publicRoutes)('registers public route %s', (path) => {
    expect(appSource).toContain(`path="${path}"`)
  })

  it('guards protected routes behind AuthGuard', () => {
    // Every protected page is rendered through withTransition + AuthGuard.
    expect(appSource).toContain('<AuthGuard>')
    expect(appSource).toContain('function AuthGuard')
  })

  it('has a catch-all 404 route', () => {
    expect(appSource).toContain('path="*"')
    expect(appSource).toContain('NotFoundPage')
  })

  it('imports shared pages from the @devdeck/features entrypoint (no deep src imports)', () => {
    expect(appSource).not.toMatch(/from ['"]\.\.\/\.\.\/\.\.\/packages\/features\/src/)
  })
})
