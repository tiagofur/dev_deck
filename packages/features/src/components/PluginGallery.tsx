import { useState } from 'react'
import { Sparkles, Download, Check, Info, User, ExternalLink, Zap } from 'lucide-react'
import { 
  useFeaturedPlugins, 
  useCreateCustomEnricher, 
  useCreateWebhook,
  useCustomEnrichers,
  useWebhooks,
  type PluginTemplate 
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'

export function PluginGallery() {
  const { data: featuredRes, isLoading } = useFeaturedPlugins()
  const { data: myEnrichersRes } = useCustomEnrichers()
  const { data: myWebhooksRes } = useWebhooks()
  
  const createEnricher = useCreateCustomEnricher()
  const createWebhook = useCreateWebhook()

  const featured = featuredRes?.plugins || []
  const myEnrichers = myEnrichersRes?.enrichers || []
  const myWebhooks = myWebhooksRes?.webhooks || []

  async function handleInstall(p: PluginTemplate) {
    try {
      if (p.type === 'enricher') {
        await createEnricher.mutateAsync({
          name: p.name,
          url_pattern: p.url_pattern!,
          endpoint_url: p.endpoint_url!
        })
      } else {
        const url = window.prompt(`Ingresá la URL de destino para ${p.name}:`)
        if (!url) return
        await createWebhook.mutateAsync({
          name: p.name,
          url,
          events: p.events!
        })
      }
      showToast(`${p.name} instalado correctamente`)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  function isInstalled(p: PluginTemplate) {
    if (p.type === 'enricher') {
      return myEnrichers.some(e => e.url_pattern === p.url_pattern)
    }
    return myWebhooks.some(w => w.name === p.name)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b-2 border-ink pb-4">
        <div>
           <h3 className="font-display font-black uppercase text-sm tracking-widest flex items-center gap-2">
             <Sparkles size={16} className="text-accent-yellow" />
             Galería de Plugins
           </h3>
           <p className="text-[10px] text-ink-soft font-mono mt-1 uppercase">Curados por la comunidad de DevDeck</p>
        </div>
      </header>

      {isLoading ? (
        <div className="p-20 text-center animate-pulse font-mono text-xs text-ink-soft">
          Explorando el ecosistema…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featured.map(p => {
            const installed = isInstalled(p)
            return (
              <div key={p.id} className="bg-bg-primary border-3 border-ink p-4 shadow-hard flex flex-col justify-between group hover:-translate-y-1 transition-all">
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                      <div className="w-10 h-10 border-2 border-ink bg-white p-1 shadow-hard-sm shrink-0">
                         <img src={p.icon_url} alt={p.name} className="w-full h-full object-contain" />
                      </div>
                      <span className={`px-2 py-0.5 border-2 border-ink text-[8px] font-black uppercase shadow-hard-sm
                        ${p.type === 'enricher' ? 'bg-accent-lavender' : 'bg-accent-cyan'}
                      `}>
                        {p.type}
                      </span>
                   </div>

                   <div>
                      <h4 className="font-display font-black text-xs uppercase tracking-tight truncate">{p.name}</h4>
                      <p className="text-[10px] text-ink-soft leading-tight mt-1 line-clamp-2 h-8">{p.description}</p>
                   </div>

                   <div className="flex items-center gap-1.5 text-[9px] font-mono text-ink/40">
                      <User size={10} />
                      <span>{p.author}</span>
                   </div>
                </div>

                <div className="mt-4 pt-4 border-t-2 border-ink/10">
                   <Button 
                    onClick={() => handleInstall(p)} 
                    disabled={installed || createEnricher.isPending || createWebhook.isPending}
                    variant={installed ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full"
                   >
                     {installed ? (
                       <span className="flex items-center gap-1.5"><Check size={12} strokeWidth={4} /> Instalado</span>
                     ) : (
                       <span className="flex items-center gap-1.5"><Download size={12} strokeWidth={3} /> Instalar</span>
                     )}
                   </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
