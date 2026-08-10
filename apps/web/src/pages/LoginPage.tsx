import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Apple, Globe, Loader2, ArrowRight } from 'lucide-react'
import { GithubIcon as Github } from '../components/icons/GithubIcon'
import { fetchAuthProviders, loginLocal, loginStep1, setTokens, type AuthProviderInfo } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [providers, setProviders] = useState<AuthProviderInfo[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [_loginType, setLoginType] = useState<'password' | 'saml'>('password')
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
        setLoadError(err instanceof Error ? err.message : t('auth.load_providers_error'))
      })
  }, [authMode, envToken, navigate, t])

  async function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)
    try {
      const res = await loginStep1(email)
      if (res.type === 'saml' && res.login_url) {
        window.location.href = res.login_url
        return
      }
      setLoginType(res.type)
      setStep(2)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t('auth.validate_email_error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)
    try {
      await loginLocal(email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : t('auth.login_error'))
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
        return <Globe size={20} strokeWidth={2.5} />
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
          {t('auth.login_subtitle')}
        </p>

        {isVerified && (
          <div className="border-3 border-ink bg-accent-lime px-4 py-2 font-mono text-xs mb-6 shadow-hard">
            {t('auth.verify_success')}
          </div>
        )}

        {isResetSuccess && (
          <div className="border-3 border-ink bg-accent-lime px-4 py-2 font-mono text-xs mb-6 shadow-hard">
            {t('auth.reset_success')}
          </div>
        )}

        {loginError && (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-6 shadow-hard">
            {loginError}
          </div>
        )}

        <div className="space-y-4 mb-8 text-left">
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">{t('auth.email_label')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
                  placeholder={t('auth.email_placeholder')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full border-3 border-ink bg-accent-lavender text-ink font-display font-bold uppercase
                           text-lg py-4 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                           active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                           transition-all duration-150 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight size={20} strokeWidth={3} /> {t('auth.continue')}</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <p className="font-mono text-[10px] text-ink-soft mb-2 bg-bg-primary p-2 border-2 border-ink inline-block">
                  {email} <button type="button" onClick={() => setStep(1)} className="ml-2 underline hover:text-accent-pink">{t('auth.change_email')}</button>
                </p>
                <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">{t('auth.password_label')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
                  placeholder={t('auth.password_placeholder')}
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
                {loading ? <Loader2 className="animate-spin" /> : t('auth.login_button')}
              </button>
            </form>
          )}
          
          <div className="flex justify-between font-mono text-[10px] uppercase font-bold px-1">
            <Link to="/forgot-password" title={t('auth.forgot_password')} className="hover:underline">{t('auth.forgot_password')}</Link>
            <Link to="/register" title={t('auth.create_account')} className="text-accent-pink hover:underline">{t('auth.create_account')}</Link>
          </div>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-ink-soft"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-bg-card px-3 font-mono font-bold text-ink-soft">{t('auth.or_continue_with')}</span></div>
        </div>

        {authMode === 'token' ? (
          <div className="font-mono text-sm text-ink-soft">{t('common.loading')}</div>
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
                title={t('auth.login_with_provider', { provider: provider.label })}
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
