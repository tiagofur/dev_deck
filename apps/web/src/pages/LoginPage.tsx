import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github } from 'lucide-react'
import { setTokens } from '@devdeck/api-client'

// Login screen for the web client.
//
// In JWT mode: shows a "Sign in with GitHub" button that redirects to the
// backend's OAuth start URL. The backend then redirects back to
// /auth/callback with ?token= and ?refresh_token= params.
//
// In token mode (dev convenience): if VITE_API_TOKEN is set, seed it into
// local storage as the access token and bounce straight to the home page.
// This matches the desktop dev workflow where the static token is baked
// in at build time.
export function LoginPage() {
  const navigate = useNavigate()

  const authMode = import.meta.env.VITE_AUTH_MODE
  const envToken = import.meta.env.VITE_API_TOKEN
  const apiUrl = import.meta.env.VITE_API_URL ?? ''

  useEffect(() => {
    if (authMode === 'token' && envToken) {
      setTokens(envToken, envToken)
      navigate('/', { replace: true })
    }
  }, [authMode, envToken, navigate])

  function loginWithGitHub() {
    window.location.href = `${apiUrl}/api/auth/github/login`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <h1 className="font-display font-black text-5xl uppercase tracking-tight mb-2">
          Dev
          <span className="bg-accent-pink px-2 border-3 border-ink">Deck</span>
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          Tu memoria externa para desarrollo.
        </p>

        <div className="w-20 h-20 mx-auto mb-6 border-3 border-ink bg-accent-lime flex items-center justify-center text-3xl">
          🦎
        </div>

        {authMode === 'token' ? (
          <div className="font-mono text-sm text-ink-soft">Cargando…</div>
        ) : (
          <button
            type="button"
            onClick={loginWithGitHub}
            className="w-full border-3 border-ink bg-ink text-white font-display font-bold uppercase
                       text-lg py-4 px-6 shadow-hard
                       hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                       active:translate-x-1 active:translate-y-1 active:shadow-hard-sm
                       transition-all duration-150 flex items-center justify-center gap-3"
          >
            <Github size={22} strokeWidth={2.5} />
            Sign in with GitHub
          </button>
        )}

        <p className="font-mono text-xs text-ink-soft mt-6">
          Solo necesitamos tu perfil público.
        </p>
      </div>
    </div>
  )
}
