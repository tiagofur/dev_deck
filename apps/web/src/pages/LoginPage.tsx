import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Apple, Chrome, Github, Loader2 } from 'lucide-react'
import { fetchAuthProviders, loginLocal, setTokens, type AuthProviderInfo } from '@devdeck/api-client'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [providers, setProviders] = useState<AuthProviderInfo[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const authMode = import.meta.env.VITE_AUTH_MODE
  const envToken = import.meta.env.VITE_API_TOKEN
  const apiUrl = import.meta.env.VITE_API_URL ?? ''
  const isVerified = searchParams.get('verified') === 'true'
  const isResetSuccess = searchParams.get('reset') === 'success'

  useEffect(() => {
    if (authMode === 'token' && envToken) {
      setTokens(envToken, envToken)
      navigate('/', { replace: true })
      return
    }
    fetchAuthProviders()
      .then((next) => {
        setProviders(next)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores.')
      })
  }, [authMode, envToken, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)
    try {
      await loginLocal(email, password)
      navigate('/', { replace: true })
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  function startLogin(provider: AuthProviderInfo['provider']) {
    window.location.href = `${apiUrl}/api/auth/${provider}/login?device=web`
  }

  function providerIcon(provider: AuthProviderInfo['provider']) {
    switch (provider) {
      case 'github':
        return <Github size={20} strokeWidth={2.5} />
      case 'google':
        return <Chrome size={20} strokeWidth={2.5} />
      case 'apple':
        return <Apple size={20} strokeWidth={2.5} />
    }
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

        {isVerified && (
          <div className="border-3 border-ink bg-accent-lime px-4 py-2 font-mono text-xs mb-6 shadow-hard">
            Email verificado correctamente. ¡Ya podés entrar!
          </div>
        )}

        {isResetSuccess && (
          <div className="border-3 border-ink bg-accent-lime px-4 py-2 font-mono text-xs mb-6 shadow-hard">
            Contraseña actualizada. ¡Ya podés entrar con la nueva!
          </div>
        )}

        {loginError && (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-6 shadow-hard">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 mb-8 text-left">
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full border-3 border-ink bg-accent-cyan text-white font-display font-bold uppercase
                       text-lg py-4 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                       active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                       transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </button>
          
          <div className="flex justify-between font-mono text-[10px] uppercase font-bold px-1">
            <Link to="/forgot-password" title="recuperar" className="hover:underline">¿Olvidaste tu contraseña?</Link>
            <Link to="/register" title="registro" className="text-accent-pink hover:underline">Crear cuenta</Link>
          </div>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-ink-soft"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-bg-card px-3 font-mono font-bold text-ink-soft">o continuar con</span></div>
        </div>

        {authMode === 'token' ? (
          <div className="font-mono text-sm text-ink-soft">Cargando…</div>
        ) : loadError ? (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-3 font-mono text-sm">
            {loadError}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {providers.map((provider) => (
              <button
                key={provider.provider}
                type="button"
                onClick={() => startLogin(provider.provider)}
                className="border-3 border-ink bg-white p-3 shadow-hard
                           hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                           active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                           transition-all duration-150 flex items-center justify-center"
                title={`Entrar con ${provider.label}`}
              >
                {providerIcon(provider.provider)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
