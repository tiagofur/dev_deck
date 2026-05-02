import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'
import { forgotPassword } from '@devdeck/api-client'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <Link to="/login" className="flex items-center gap-2 font-mono text-xs uppercase font-bold mb-6 hover:translate-x-1 transition-transform inline-block">
          <ArrowLeft size={14} /> Volver al login
        </Link>
        
        <h1 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
          ¿Olvidaste tu <span className="bg-accent-yellow px-2 border-3 border-ink">Pass</span>?
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          Ingresá tu email y te mandamos un link de recuperación.
        </p>

        {success ? (
          <div className="border-3 border-ink bg-accent-lime px-4 py-6 font-mono text-sm shadow-hard">
            <div className="text-2xl mb-2">📬</div>
            Si el email existe, recibirás un link en unos minutos.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && (
              <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-4 shadow-hard">
                {error}
              </div>
            )}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full border-3 border-ink bg-ink text-white font-display font-bold uppercase
                         text-lg py-4 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                         active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                         transition-all duration-150 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Enviar Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
