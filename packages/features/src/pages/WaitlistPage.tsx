import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useJoinWaitlist } from '@devdeck/api-client'
import { Button } from '@devdeck/ui'

export function WaitlistPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const join = useJoinWaitlist()
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await join.mutateAsync(email)
      setDone(true)
    } catch (err) {
      // handled by global error toast if any, but we'll stay simple
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
        <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 border-3 border-ink bg-accent-lime flex items-center justify-center">
            <CheckCircle2 size={40} strokeWidth={3} />
          </div>
          <h2 className="font-display font-black text-3xl uppercase mb-4">¡Anotado!</h2>
          <p className="font-mono text-sm text-ink-soft mb-8">
            Ya estás en la lista de espera. Te avisaremos a <strong>{email}</strong> en cuanto tengamos un lugar para vos.
          </p>
          <Button onClick={() => navigate('/')}>Volver al inicio</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 font-mono text-xs uppercase font-bold hover:text-accent-pink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={3} /> Volver
        </button>
        
        <h1 className="font-display font-black text-4xl uppercase tracking-tight mb-2">
          Unite a la <span className="bg-accent-yellow px-2 border-3 border-ink">Waitlist</span>
        </h1>
        <p className="font-mono text-sm text-ink-soft mb-8">
          DevDeck está creciendo. Dejanos tu email y te mandamos una invitación pronto.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8 text-left">
          <div>
            <label className="block font-display font-bold uppercase text-xs mb-1 ml-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink-soft">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-3 border-ink bg-bg-primary pl-11 pr-4 py-3 font-mono text-sm focus:outline-none focus:bg-white shadow-hard-sm"
                placeholder="tu@email.com"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={join.isPending}
            variant="accent"
            className="w-full py-4 text-lg"
          >
            {join.isPending ? <Loader2 className="animate-spin" /> : 'Sumarme a la lista'}
          </Button>
        </form>

        <div className="font-mono text-[10px] text-ink-soft leading-tight">
          Al sumarte, aceptás que te enviemos un email (y solo uno) cuando tu invitación esté lista.
        </div>
      </div>
    </div>
  )
}
