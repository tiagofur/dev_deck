import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import { SwipeCard, type SwipeDirection } from '../components/Discovery/SwipeCard'
import {
  useDiscoveryNext,
  useMarkSeen,
  useUpdateRepo,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'

export function DiscoveryPage() {
  const navigate = useNavigate()
  const { data: repo, isLoading, error, refetch } = useDiscoveryNext()
  const markSeen = useMarkSeen()
  const updateRepo = useUpdateRepo()

  async function handleSwipe(dir: SwipeDirection) {
    if (!repo) return
    try {
      switch (dir) {
        case 'right':
          await markSeen.mutateAsync(repo.id)
          showToast('Marcado como visto')
          break
        case 'left':
          await updateRepo.mutateAsync({
            id: repo.id,
            input: { archived: true },
          })
          showToast('Archivado')
          break
        case 'up':
          window.open(repo.url, '_blank', 'noopener,noreferrer')
          await markSeen.mutateAsync(repo.id)
          showToast('Abierto en browser')
          break
      }
      // Force refetch — useDiscoveryNext has gcTime: 0 so this is fresh.
      void refetch()
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-accent-lavender flex flex-col">
      {/* Header */}
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <Sparkles size={22} strokeWidth={3} />
          Modo descubrimiento
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {isLoading && (
          <p className="font-mono text-ink-soft">Buscando algo para vos…</p>
        )}

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-md">
            <p className="font-display font-bold text-lg mb-1">Error</p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !error && !repo && (
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">🎉</div>
            <h2 className="font-display font-black text-4xl uppercase mb-3">
              ¡Listo!
            </h2>
            <p className="font-mono text-ink mb-8">
              Revisaste todos los repos no archivados de tu colección. Volvé en unos días.
            </p>
            <Button onClick={() => navigate('/')}>Volver al inicio</Button>
          </div>
        )}

        {repo && (
          <AnimatePresence mode="wait">
            <motion.div
              key={repo.id}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className="w-full flex justify-center"
            >
              <SwipeCard repo={repo} onSwipe={handleSwipe} />
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
