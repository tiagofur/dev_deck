import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { showToast } from '@devdeck/ui'
import { Loader2 } from 'lucide-react'

/**
 * Handle incoming links from the Web Share Target API.
 * Route: /capture-share
 */
export function CaptureSharePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const url = searchParams.get('url') || searchParams.get('text')
    const title = searchParams.get('title')

    if (!url) {
      showToast('No se encontró un link para capturar', 'error')
      navigate('/', { replace: true })
      return
    }

    // Redirect to home and trigger capture automatically.
    // The home page (or global layout) should listen for these state params.
    navigate('/', { 
      replace: true, 
      state: { 
        autoCapture: true, 
        url, 
        title 
      } 
    })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-6 p-12 text-center">
      <div className="w-20 h-20 border-4 border-ink bg-accent-yellow shadow-hard flex items-center justify-center animate-spin-slow">
        <Loader2 size={40} strokeWidth={3} className="animate-spin" />
      </div>
      <div>
        <h2 className="font-display font-black text-2xl uppercase tracking-tight">Capturando Link…</h2>
        <p className="text-ink-soft font-mono text-sm mt-2">Preparando tu vault para el nuevo descubrimiento.</p>
      </div>
    </div>
  )
}
