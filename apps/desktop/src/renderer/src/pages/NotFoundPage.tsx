import { Link } from 'react-router-dom'
import { useTranslation } from '@devdeck/i18n'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 border-3 border-ink bg-accent-yellow flex items-center justify-center text-4xl">
          🦎
        </div>
        <h1 className="font-display font-black text-5xl uppercase tracking-tight mb-2">404</h1>
        <p className="font-mono text-sm text-ink-soft mb-2 uppercase font-bold">
          {t('not_found.title')}
        </p>
        <p className="font-mono text-sm text-ink-soft mb-6">{t('not_found.desc')}</p>
        <Link
          to="/"
          className="inline-block border-3 border-ink bg-accent-pink text-ink
                     font-display font-bold uppercase py-3 px-6 shadow-hard
                     hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                     active:translate-x-1 active:translate-y-1 active:shadow-hard-sm
                     transition-all duration-150"
        >
          {t('not_found.back')}
        </Link>
      </div>
    </div>
  )
}
