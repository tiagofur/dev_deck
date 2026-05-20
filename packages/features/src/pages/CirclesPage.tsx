import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Copy, Check, ChevronLeft, LogOut } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useCircles, useCreateCircle, useJoinCircle, useLeaveCircle } from '@devdeck/api-client'
import clsx from 'clsx'

export function CirclesPage() {
  const navigate = useNavigate()
  const { data: circles = [], isLoading, error } = useCircles()
  const createCircle = useCreateCircle()
  const joinCircle = useJoinCircle()
  const leaveCircle = useLeaveCircle()

  const [inviteCode, setInviteCode] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create Circle Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return

    try {
      const code = inviteCode.trim().toUpperCase()
      const joined = await joinCircle.mutateAsync({ invite_code: code })
      showToast('¡Te uniste al círculo con éxito! 🎉')
      setInviteCode('')
      navigate(`/circles/${joined.id}`)
    } catch (err) {
      showToast((err as Error).message || 'No se pudo unir al círculo', 'error')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const created = await createCircle.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      })
      showToast('Círculo creado con éxito 🚀')
      setName('')
      setDescription('')
      setShowCreateModal(false)
      navigate(`/circles/${created.id}`)
    } catch (err) {
      showToast((err as Error).message || 'Error al crear el círculo', 'error')
    }
  }

  async function handleLeave(e: React.MouseEvent, circleId: string, circleName: string) {
    e.stopPropagation()
    if (!confirm(`¿Estás seguro de que quieres salir del círculo "${circleName}"?`)) return

    try {
      await leaveCircle.mutateAsync(circleId)
      showToast(`Saliste de "${circleName}"`)
    } catch (err) {
      showToast((err as Error).message || 'Error al salir del círculo', 'error')
    }
  }

  const handleCopyInvite = (e: React.MouseEvent, id: string, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    showToast('Código de invitación copiado')
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft bg-bg-primary">
        Cargando tus círculos…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar Navigation */}
      <aside className="w-56 shrink-0 border-r-3 border-ink bg-bg-elevated p-5 flex flex-col justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-mono text-ink-soft
                       hover:text-ink mb-6 transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={3} />
            Volver
          </button>

          <h2 className="font-display font-black text-xs uppercase tracking-widest mb-3 text-ink">
            Círculos
          </h2>
          <p className="font-mono text-xs text-ink-soft leading-relaxed mb-6">
            Espacios compartidos para compartir ideas, repos, comandos y tips con tus amigos o equipos de desarrollo.
          </p>

          <Button onClick={() => setShowCreateModal(true)} className="w-full flex items-center justify-center gap-2">
            <Plus size={14} strokeWidth={3} />
            Crear Círculo
          </Button>
        </div>

        <div className="border-t-2 border-ink border-dashed pt-4">
          <p className="font-mono text-[10px] text-ink-soft text-center">
            DevDeck Circles v1.0
          </p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl uppercase tracking-tight flex items-center gap-3">
              <Users size={36} strokeWidth={3} />
              Tus Círculos
            </h1>
            <p className="font-mono text-sm text-ink-soft mt-2">
              Tenés {circles.length} {circles.length === 1 ? 'círculo activo' : 'círculos activos'}
            </p>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl mb-6">
            <p className="font-display font-bold text-lg mb-1">
              Error al listar círculos
            </p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of Circles */}
          <div className="lg:col-span-2 space-y-6">
            {circles.length === 0 ? (
              <div className="bg-bg-card border-3 border-ink shadow-hard p-10 text-center">
                <Users size={48} strokeWidth={2} className="mx-auto mb-4 text-ink-soft" />
                <p className="font-display font-bold text-lg uppercase mb-2">No estás en ningún círculo</p>
                <p className="font-mono text-sm text-ink-soft max-w-md mx-auto mb-6">
                  Creá uno nuevo para invitar a tus colegas o unite a uno existente usando un código de invitación.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Crear primer círculo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {circles.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/circles/${c.id}`)}
                    className="bg-bg-card border-3 border-ink shadow-hard p-5 flex flex-col justify-between cursor-pointer
                               hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                               active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                               transition-all duration-150 group relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-display font-black text-xl uppercase group-hover:text-accent-pink transition-colors">
                          {c.name}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => handleLeave(e, c.id, c.name)}
                          title="Salir del círculo"
                          className="border-2 border-ink p-1 bg-bg-card hover:bg-danger hover:text-white
                                     opacity-0 group-hover:opacity-100 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                        >
                          <LogOut size={12} strokeWidth={3} />
                        </button>
                      </div>
                      {c.description ? (
                        <p className="font-mono text-xs text-ink-soft line-clamp-3 mb-4">
                          {c.description}
                        </p>
                      ) : (
                        <p className="font-mono text-xs text-ink-soft/40 italic mb-4">
                          Sin descripción
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t-2 border-ink border-dashed pt-3 mt-4">
                      <span className="font-mono text-[10px] uppercase text-ink-soft font-bold">
                        Invite Code
                      </span>
                      <button
                        onClick={(e) => handleCopyInvite(e, c.id, c.invite_code)}
                        className="flex items-center gap-1.5 border-2 border-ink bg-bg-elevated px-2 py-0.5
                                   font-mono text-[11px] font-bold hover:bg-accent-yellow transition-colors"
                      >
                        {c.invite_code}
                        {copiedId === c.id ? <Check size={10} strokeWidth={3} /> : <Copy size={10} strokeWidth={3} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-6">
            <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
              <h2 className="font-display font-black text-lg uppercase tracking-tight mb-4 flex items-center gap-2">
                Unirse a un Círculo
              </h2>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">
                    Código de Invitación
                  </label>
                  <input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="E.g., A2B3C4D5"
                    maxLength={8}
                    required
                    className="w-full border-3 border-ink p-2 font-mono text-sm uppercase focus:outline-none focus:bg-accent-yellow/20"
                  />
                </div>
                <Button type="submit" className="w-full flex items-center justify-center gap-2">
                  Unirse
                </Button>
              </form>
            </div>

            <div className="bg-accent-lime border-3 border-ink shadow-hard p-5">
              <h3 className="font-display font-black text-lg uppercase tracking-tight mb-2">
                ¿Qué es un Círculo?
              </h3>
              <ul className="font-mono text-xs text-ink space-y-2 list-disc list-inside">
                <li>Compartí rápidamente repos, scripts CLI y tips.</li>
                <li>Hacé que tu equipo tenga las mismas herramientas.</li>
                <li>Creación instantánea, invitá con un solo click.</li>
                <li>100% aislado y seguro para tus datos de equipo.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40"
          onClick={() => setShowCreateModal(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-lg"
          >
            <header className="flex items-center justify-between mb-5">
              <h2 className="font-display font-black text-2xl uppercase">Crear Nuevo Círculo</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors"
              >
                <ChevronLeft size={18} strokeWidth={3} />
              </button>
            </header>

            <div className="space-y-4">
              <div>
                <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">
                  Nombre *
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Devs del Futuro, Sysops Team"
                  required
                  className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
                />
              </div>
              <div>
                <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Espacio para compartir los mejores comandos bash, repos recomendados y tips de desarrollo."
                  rows={3}
                  className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 bg-bg-card"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCircle.isPending || !name.trim()}>
                {createCircle.isPending ? 'Creando…' : 'Crear Círculo'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
