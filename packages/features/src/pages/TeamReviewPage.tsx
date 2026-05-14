import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Box, CheckCircle2, Users } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { useItems } from '@devdeck/api-client'
import { ItemCard } from '../components/ItemCard'

export function TeamReviewPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useItems({
    tag: 'team-review',
    limit: 200,
    sort: 'updated_desc',
  })
  const items = data?.items ?? []

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/items')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150"
          aria-label="Volver a items"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-soft uppercase">/ review</p>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
            <Users size={22} strokeWidth={3} />
            Revisión del equipo
          </h1>
        </div>
        <div className="flex-1" />
        <Button type="button" variant="secondary" onClick={() => navigate('/items')}>
          Ver todos
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <section className="mb-6 border-3 border-ink bg-accent-yellow/30 p-4 shadow-hard max-w-4xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} strokeWidth={3} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="font-display font-black uppercase text-lg">Cola de curación</h2>
              <p className="font-mono text-sm text-ink-soft mt-1">
                Estos items están marcados para revisión humana antes de convertirse en conocimiento de equipo.
              </p>
            </div>
          </div>
        </section>

        {isLoading && <p className="font-mono text-ink-soft">Cargando revisión…</p>}

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
            <p className="font-display font-bold text-lg mb-1">No se pudo cargar la cola</p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Box size={64} strokeWidth={2} className="mb-4 opacity-50" />
            <p className="font-display font-bold text-xl mb-2">Nada esperando revisión</p>
            <p className="font-mono text-sm text-ink-soft max-w-sm mb-6">
              Cuando captures algo importante, márcalo como review para traerlo a esta cola.
            </p>
            <Button type="button" variant="accent" onClick={() => navigate('/items')}>
              Ir a items
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className="font-mono text-xs text-ink-soft mb-4">
              {data?.total} items esperando revisión
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((it) => (
                <ItemCard key={it.id} item={it} onClick={() => navigate(`/items/${it.id}`)} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
