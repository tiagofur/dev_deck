import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, ChevronLeft } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useJoinCircle } from '@devdeck/api-client'

export function CircleJoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const joinCircle = useJoinCircle()
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (!inviteCode || hasTriggered.current) return
    hasTriggered.current = true

    async function executeJoin() {
      try {
        const code = inviteCode!.trim().toUpperCase()
        const joined = await joinCircle.mutateAsync({ invite_code: code })
        showToast('¡Te uniste al círculo con éxito! 🎉')
        navigate(`/circles/${joined.id}`, { replace: true })
      } catch (err) {
        showToast((err as Error).message || 'No se pudo unir al círculo', 'error')
      }
    }

    executeJoin()
  }, [inviteCode, joinCircle, navigate])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="bg-bg-card border-5 border-ink shadow-hard-xl p-8 max-w-md w-full text-center relative overflow-hidden">
        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-accent-yellow border-b-3 border-l-3 border-ink flex items-center justify-center rotate-12 translate-x-4 -translate-y-4">
          <Sparkles size={16} strokeWidth={3} className="text-ink" />
        </div>

        {joinCircle.isPending && (
          <div className="py-6 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-accent-pink animate-spin mb-4" strokeWidth={3} />
            <h2 className="font-display font-black text-2xl uppercase tracking-tight mb-2">
              Uniéndose al Círculo
            </h2>
            <p className="font-mono text-xs text-ink-soft">
              Validando código de invitación <span className="font-bold text-ink">"{inviteCode?.toUpperCase()}"</span> y preparando tu vault...
            </p>
          </div>
        )}

        {joinCircle.isError && (
          <div className="py-4">
            <div className="w-16 h-16 bg-accent-pink border-3 border-ink flex items-center justify-center mx-auto mb-4 rounded-full shadow-hard-sm">
              <span className="font-display font-black text-xl">!</span>
            </div>
            <h2 className="font-display font-black text-2xl uppercase tracking-tight text-danger mb-2">
              No se pudo unir
            </h2>
            <p className="font-mono text-xs text-ink-soft mb-6 bg-danger/10 border-2 border-dashed border-danger/40 p-3">
              {(joinCircle.error as Error).message || 'El código de invitación no es válido o ya venció.'}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/circles')} className="w-full flex items-center justify-center gap-2">
                <ChevronLeft size={14} strokeWidth={3} />
                Ir a Círculos
              </Button>
              <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
                Ir al Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
