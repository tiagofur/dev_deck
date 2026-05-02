import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { registerUser } from '@devdeck/api-client'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
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
      await registerUser(email, password)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta')
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
          <h2 className="font-display font-black text-3xl uppercase mb-4">¡Casi listo!</h2>
          <p className="font-mono text-sm text-ink-soft mb-8">
            Hemos enviado un email de verificación a <strong>{email}</strong>. 
            Por favor, revisá tu casilla para activar tu cuenta.
          </p>
          <Link
            to="/login"
            className="inline-block border-3 border-ink bg-ink text-white font-display font-bold uppercase
                       text-lg py-3 px-8 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                       transition-all duration-150"
          >
            Ir al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <h1 className="font-display font-black text-4xl uppercase tracking-tight mb-2">
          Crear <span className="bg-accent-lime px-2 border-3 border-ink">Cuenta</span>
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          Unite a la comunidad DevDeck.
        </p>

        {error && (
          <div className="border-3 border-ink bg-accent-yellow px-4 py-2 font-mono text-xs mb-6 shadow-hard text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 mb-8 text-left">
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
              placeholder="Repetí tu contraseña"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full border-3 border-ink bg-accent-pink text-white font-display font-bold uppercase
                       text-lg py-4 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                       active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                       transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Registrarme'}
          </button>
        </form>

        <div className="font-mono text-xs text-ink-soft">
          ¿Ya tenés cuenta? <Link to="/login" className="text-accent-cyan font-bold hover:underline">Iniciá sesión</Link>
        </div>
      </div>
    </div>
  )
}
