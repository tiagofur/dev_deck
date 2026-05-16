import { useState, useEffect } from 'react'
import { Sparkles, Brain, Loader2, CheckCircle2 } from 'lucide-react'
import { useCapture, isLoggedIn } from '@devdeck/api-client'
import { Button } from '@devdeck/ui'

export function Popup() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)
  const capture = useCapture()
  const [done, setDone] = useState(false)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      setTab(activeTab)
    })
  }, [])

  async function handleCapture() {
    if (!tab?.url) return
    try {
      await capture.mutateAsync({
        url: tab.url,
        title_hint: tab.title,
      })
      setDone(true)
      setTimeout(() => window.close(), 2000)
    } catch (err) {
      console.error('Capture failed:', err)
    }
  }

  if (!isLoggedIn()) {
    return (
      <div className="p-6 text-center space-y-4">
        <Brain size={48} className="mx-auto text-accent-pink" />
        <p className="font-display font-black uppercase text-lg">Sesión no iniciada</p>
        <p className="text-xs text-ink-soft font-mono">Por favor, abrí las opciones de la extensión para loguearte.</p>
        <Button onClick={() => chrome.runtime.openOptionsPage()}>Configurar</Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="p-6 text-center space-y-4 animate-in fade-in zoom-in duration-300">
        <CheckCircle2 size={48} className="mx-auto text-accent-lime" />
        <p className="font-display font-black uppercase text-xl">¡Guardado!</p>
        <p className="text-xs text-ink-soft font-mono">El item ya está en tu vault.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display font-black uppercase text-xl tracking-tight flex items-center gap-2">
          <Sparkles size={20} className="text-accent-yellow fill-accent-yellow" />
          DevDeck
        </h1>
        <span className="text-[9px] font-mono bg-bg-elevated border border-ink px-1.5 py-0.5 uppercase font-bold text-ink-soft">
          Quick Capture
        </span>
      </header>

      <div className="bg-bg-card border-3 border-ink shadow-hard p-4 space-y-2">
        <p className="font-display font-bold text-xs uppercase truncate">{tab?.title || 'Cargando...'}</p>
        <p className="font-mono text-[10px] text-ink-soft truncate">{tab?.url}</p>
      </div>

      <Button
        onClick={handleCapture}
        disabled={capture.isPending || !tab}
        className="w-full py-4 text-lg"
        variant="accent"
      >
        {capture.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin" /> Guardando...
          </span>
        ) : (
          'Capturar ahora'
        )}
      </Button>

      <footer className="text-center">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-[10px] font-mono uppercase font-bold text-ink-soft hover:text-ink underline"
        >
          Configuración
        </button>
      </footer>
    </div>
  )
}
