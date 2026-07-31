import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { registerUser } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

export function RegisterPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
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
      await registerUser(email, password, inviteCode)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.register_error'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
        <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 border-3 border-ink bg-accent-lime flex items-center justify-center text-4xl">
            📧
          </div>
          <h2 className="font-display font-black text-3xl uppercase mb-4">{t('auth.almost_ready')}</h2>
          <p className="font-mono text-sm text-ink-soft mb-8">
            {t('auth.verification_sent', { email: <strong>{email}</strong> })}
          </p>
          <Link
            to="/login"
            className="inline-block border-3 border-ink bg-ink text-white font-display font-bold uppercase
                       text-lg py-3 px-8 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                       transition-all duration-150"
          >
            {t('auth.login_button')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <h1 className="font-display font-black text-4xl uppercase tracking-tight mb-2">
          {t('auth.register_title')}
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          {t('auth.register_subtitle')}
        </p>

        {error && (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-6 shadow-hard text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 mb-8 text-left">
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">{t('auth.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder={t('auth.email_placeholder')}
            />
          </div>
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
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">{t('auth.invite_code_label')}</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder={t('auth.invite_code_placeholder')}
            />
            <p className="text-[10px] font-mono text-ink-soft mt-1 ml-1">
              {t('auth.waitlist_hint')}
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full border-3 border-ink bg-accent-pink text-white font-display font-bold uppercase
                       text-lg py-4 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                       active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                       transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : t('auth.register_me')}
          </button>
        </form>

        <div className="font-mono text-xs text-ink-soft">
          {t('auth.already_have_account')} <Link to="/login" className="text-accent-cyan font-bold hover:underline">{t('auth.login_button')}</Link>
        </div>
      </div>
    </div>
  )
}
