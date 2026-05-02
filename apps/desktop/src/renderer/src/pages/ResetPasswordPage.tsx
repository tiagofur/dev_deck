import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2, KeyRound } from 'lucide-react'
import { resetPassword } from '@devdeck/api-client'

export function ResetPasswordPage() {
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
      setError('Token ausente o inválido')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login?reset=success', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
        <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="font-display font-black text-3xl uppercase mb-4">Link Inválido</h1>
          <p className="font-mono text-sm text-ink-soft mb-8">
            Este link de recuperación no es válido o ya expiró.
          </p>
          <Link to="/forgot-password" className="text-accent-cyan font-bold hover:underline">Solicitar uno nuevo</Link>
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
          Nueva <span className="bg-accent-pink px-2 border-3 border-ink">Pass</span>
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          Elegí una contraseña segura.
        </p>

        {error && (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-6 shadow-hard text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border-3 border-ink bg-bg-primary px-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
              placeholder="Repetí la contraseña"
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
            {loading ? <Loader2 className="animate-spin" /> : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
