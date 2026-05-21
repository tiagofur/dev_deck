import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2, KeyRound } from 'lucide-react'
import { resetPassword } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError(t('auth.token_invalid'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwords_dont_match'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.password_too_short'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login?reset=success', { replace: true })
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
        <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="font-display font-black text-3xl uppercase mb-4">{t('auth.token_invalid')}</h1>
          <p className="font-mono text-sm text-ink-soft mb-8">
            {t('auth.token_invalid')}
          </p>
          <Link to="/forgot-password" className="text-accent-cyan font-bold hover:underline">{t('auth.send_link')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 border-3 border-ink bg-accent-cyan flex items-center justify-center text-white">
          <KeyRound size={32} />
        </div>
        <h1 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
          {t('auth.reset_title')}
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          {t('auth.reset_subtitle')}
        </p>

        {error && (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-6 shadow-hard text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">{t('auth.password_label')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder={t('auth.password_min_length')}
            />
          </div>
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">{t('auth.confirm_password_placeholder')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder={t('auth.confirm_password_placeholder')}
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
            {loading ? <Loader2 className="animate-spin" /> : t('auth.reset_button')}
          </button>
        </form>
      </div>
    </div>
  )
}
