import { useState, useRef, useEffect } from 'react'
import { Bell, Check, ExternalLink, Mail, ShieldCheck, Sparkles, X } from 'lucide-react'
import { 
  useNotifications, 
  useUnreadNotificationsCount, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  type Notification
} from '@devdeck/api-client'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { data: countData } = useUnreadNotificationsCount()
  const { data: notificationsRes, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = countData?.unread_count || 0
  const notifications = notificationsRes?.notifications || []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleNotificationClick(n: Notification) {
    if (!n.read_at) {
      await markRead.mutateAsync(n.id)
    }
    setOpen(false)
    if (n.action_url) {
      if (n.action_url.startsWith('/')) {
        navigate(n.action_url)
      } else {
        window.open(n.action_url, '_blank')
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 border-3 border-ink shadow-hard transition-all active:shadow-none active:translate-x-0.5 active:translate-y-0.5
          ${open ? 'bg-accent-yellow' : 'bg-bg-card hover:bg-bg-elevated'}
        `}
        aria-label="Notificaciones"
      >
        <Bell size={18} strokeWidth={3} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-accent-pink text-white text-[9px] font-black border-2 border-ink px-1.5 py-0.5 shadow-hard-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-bg-card border-3 border-ink shadow-hard-lg z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
          <header className="bg-bg-elevated border-b-3 border-ink p-4 flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-accent-pink" />
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[9px] font-mono uppercase font-black hover:text-accent-pink underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </header>

          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center font-mono text-xs text-ink-soft animate-pulse">
                Cargando…
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y-2 divide-ink/5">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-4 hover:bg-bg-primary transition-colors group relative
                      ${!n.read_at ? 'bg-accent-yellow/5' : ''}
                    `}
                  >
                    {!n.read_at && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-pink" />
                    )}
                    <div className="flex items-start gap-3">
                       <div className="mt-0.5">
                          <NotificationIcon type={n.type} />
                       </div>
                       <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold uppercase tracking-tight truncate ${!n.read_at ? 'text-ink' : 'text-ink-soft'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-ink-soft line-clamp-2 mt-0.5 leading-relaxed">
                            {n.body}
                          </p>
                          <p className="text-[9px] font-mono text-ink/30 mt-2">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                       </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center space-y-4">
                <Check size={32} className="mx-auto text-accent-lime" strokeWidth={3} />
                <p className="font-mono text-xs text-ink-soft uppercase font-bold tracking-tight">Todo al día</p>
              </div>
            )}
          </div>
          
          <footer className="border-t-3 border-ink p-3 bg-bg-elevated text-center">
             <button 
              onClick={() => setOpen(false)}
              className="text-[10px] font-display font-black uppercase tracking-widest hover:text-accent-pink transition-colors"
             >
                Cerrar
             </button>
          </footer>
        </div>
      )}
    </div>
  )
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'weekly_digest':
      return <Mail size={14} className="text-accent-lavender" strokeWidth={3} />
    case 'enrichment_done':
      return <Sparkles size={14} className="text-accent-yellow" strokeWidth={3} />
    default:
      return <ShieldCheck size={14} className="text-accent-cyan" strokeWidth={3} />
  }
}
