import { useState } from 'react'
import { Trash2, Plus, Zap, Shield, Key } from 'lucide-react'
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'

const AVAILABLE_EVENTS = [
  { id: 'item.created', label: 'Item Creado' },
  { id: 'item.updated_notes', label: 'Notas Actualizadas' },
  { id: 'runbook.created', label: 'Runbook Creado' },
  { id: 'deck.created', label: 'Deck Creado' }
]

export function WebhookManager() {
  const { data: hooksRes, isLoading } = useWebhooks()
  const createWebhook = useCreateWebhook()
  const deleteWebhook = useDeleteWebhook()
  
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [showForm, setShowShowForm] = useState(false)

  const webhooks = hooksRes?.webhooks || []

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !url || selectedEvents.length === 0) {
      showToast('Completá todos los campos y elegí al menos un evento', 'error')
      return
    }
    
    try {
      await createWebhook.mutateAsync({ name, url, events: selectedEvents })
      showToast('Webhook registrado')
      setName('')
      setUrl('')
      setSelectedEvents([])
      setShowShowForm(false)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  function toggleEvent(id: string) {
    setSelectedEvents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {webhooks.map(w => (
          <div key={w.id} className="p-4 border-3 border-ink bg-bg-primary shadow-hard-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-accent-yellow" fill="currentColor" />
                <p className="font-display font-black text-xs uppercase tracking-tight">{w.name}</p>
              </div>
              <button 
                onClick={() => deleteWebhook.mutate(w.id)}
                className="p-1.5 hover:bg-accent-pink border-2 border-transparent hover:border-ink transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="font-mono text-[10px] space-y-2">
              <p className="truncate text-ink-soft bg-bg-card p-2 border border-ink/20">
                {w.url}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {w.events.map(ev => (
                  <span key={ev} className="px-2 py-0.5 bg-accent-cyan/10 border border-accent-cyan text-accent-cyan-dark font-bold">
                    {ev}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                 <Key size={10} className="text-ink-soft" />
                 <span className="text-ink-soft">Secret:</span>
                 <code className="text-ink font-bold select-all bg-accent-yellow/5 px-1">
                   {w.secret}
                 </code>
              </div>
            </div>
          </div>
        ))}
        
        {webhooks.length === 0 && !isLoading && !showForm && (
          <p className="text-center py-8 border-2 border-dashed border-ink/20 font-mono text-xs text-ink-soft italic">
            No hay webhooks de salida configurados.
          </p>
        )}
      </div>

      {!showForm ? (
        <Button onClick={() => setShowShowForm(true)} className="w-full" size="sm" variant="secondary">
          <Plus size={14} className="mr-2" strokeWidth={3} />
          Nuevo Webhook de Salida
        </Button>
      ) : (
        <form onSubmit={handleCreate} className="bg-bg-elevated border-3 border-ink p-5 shadow-hard space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <h4 className="font-display font-black uppercase text-xs tracking-widest flex items-center gap-2">
            <Zap size={14} /> Configurar Webhook
          </h4>
          
          <div className="space-y-3">
            <input 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre (ej: Slack Integration)"
              className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/10 outline-none"
            />
            <input 
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="URL del Endpoint (HTTPS recomendado)"
              className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/10 outline-none"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-ink-soft">Eventos Suscritos:</p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => toggleEvent(ev.id)}
                  className={`p-2 border-2 text-[10px] font-mono text-left transition-all
                    ${selectedEvents.includes(ev.id) ? 'bg-accent-lime border-ink shadow-hard-sm' : 'bg-bg-card border-ink/20 opacity-60'}
                  `}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" size="sm" disabled={createWebhook.isPending}>
              Guardar Webhook
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
