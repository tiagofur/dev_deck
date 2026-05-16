import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { getPendingCount, syncNow } from '@devdeck/api-client'

export function SyncStatusIndicator() {
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncInProgress] = useState(false)

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    
    const interval = setInterval(async () => {
      const count = await getPendingCount()
      setPending(count)
    }, 2000)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      clearInterval(interval)
    }
  }, [])

  const handleSync = async () => {
    setSyncInProgress(true)
    try {
      await syncNow()
      const count = await getPendingCount()
      setPending(count)
    } finally {
      setSyncInProgress(false)
    }
  }

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-accent-pink border-2 border-ink shadow-hard-sm text-[10px] font-mono uppercase font-bold">
        <CloudOff size={12} strokeWidth={3} />
        Sin conexión
      </div>
    )
  }

  if (pending > 0) {
    return (
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-1 bg-accent-yellow border-2 border-ink shadow-hard-sm text-[10px] font-mono uppercase font-bold hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all active:shadow-none active:translate-x-0 active:translate-y-0"
      >
        <RefreshCw size={12} strokeWidth={3} className={syncing ? 'animate-spin' : ''} />
        {pending} pendientes
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-accent-lime border-2 border-ink shadow-hard-sm text-[10px] font-mono uppercase font-bold">
      <Cloud size={12} strokeWidth={3} />
      Sincronizado
    </div>
  )
}
