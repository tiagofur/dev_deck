import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  parseAuthErrorFromQuery,
  parseTokensFromFragment,
  parseTokensFromQuery,
} from '@devdeck/api-client'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const authError = parseAuthErrorFromQuery()
    if (authError) {
      setAuthError(authError.message)
      return
    }
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
        {authError ? (
          <div className="space-y-4">
            <p className="font-mono text-sm">{authError}</p>
            <Link
              to="/login"
              className="inline-flex border-3 border-ink bg-ink px-4 py-2 font-display font-bold uppercase text-white shadow-hard"
            >
              Volver al login
            </Link>
          </div>
        ) : (
          <p className="font-mono text-sm">Autenticando…</p>
        )}
      </div>
    </div>
  )
}
