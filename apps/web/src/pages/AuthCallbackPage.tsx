import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseTokensFromQuery, parseTokensFromFragment } from '@devdeck/api-client'

// OAuth redirect landing page.
//
// The backend redirects to /auth/callback with either:
//   - query params ?token=...&refresh_token=... (current backend)
//   - URL fragment #access_token=...&refresh_token=... (fallback)
//
// We accept both, persist them via the injected TokenStorage, and redirect
// home. On failure, bounce to /login.
export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const fromQuery = parseTokensFromQuery()
    const fromFragment = fromQuery ?? parseTokensFromFragment()
    if (fromFragment) {
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="border-3 border-ink bg-bg-card shadow-hard px-10 py-8 text-center">
        <div className="w-12 h-12 border-3 border-ink bg-accent-lime mx-auto mb-4 flex items-center justify-center text-xl">
          🦎
        </div>
        <p className="font-mono text-sm">Autenticando…</p>
      </div>
    </div>
  )
}
