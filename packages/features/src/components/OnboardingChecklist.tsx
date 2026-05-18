import { Check, Chrome, Monitor, Brain, MessageSquare } from 'lucide-react'
import { Button } from '@devdeck/ui'

export function OnboardingChecklist() {
  const isDesktop = typeof (window as any).electronAPI !== 'undefined'

  return (
    <div className="max-w-md w-full bg-bg-card border-3 border-ink shadow-hard p-6 text-left">
      <h3 className="font-display font-black uppercase text-sm tracking-widest mb-4">Próximos pasos</h3>
      
      <div className="space-y-4">
        <CheckItem 
            done={true} 
            label="Crear tu cuenta" 
            desc="Bienvenido al sistema operativo del conocimiento."
        />
        <CheckItem 
            done={false} 
            label="Instalar la extensión" 
            desc="Captura links sin salir del navegador."
            action={<Button size="sm" variant="secondary" onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}><Chrome size={12} className="mr-1" /> Instalar</Button>}
        />
        {!isDesktop && (
          <CheckItem 
            done={false} 
            label="Bajar app de escritorio" 
            desc="Ejecuta comandos locales y atajos globales."
            action={<Button size="sm" variant="secondary" onClick={() => window.open('/download', '_blank')}><Monitor size={12} className="mr-1" /> Bajar</Button>}
          />
        )}
        <CheckItem 
            done={false} 
            label="Tu primera captura" 
            desc="Pega una URL de GitHub o un post de un blog."
        />
        <CheckItem 
            done={false} 
            label="Hablar con el agente" 
            desc="Presioná Cmd+K y pedile ayuda para organizar tu vault."
            icon={<MessageSquare size={14} />}
        />
      </div>
    </div>
  )
}

function CheckItem({ done, label, desc, action, icon }: { done: boolean, label: string, desc: string, action?: React.ReactNode, icon?: React.ReactNode }) {
    return (
        <div className={`flex gap-3 ${done ? 'opacity-40' : ''}`}>
            <div className={`w-6 h-6 border-2 border-ink flex items-center justify-center shrink-0 mt-0.5
                ${done ? 'bg-accent-lime' : 'bg-bg-primary'}
            `}>
                {done && <Check size={14} strokeWidth={4} />}
                {!done && icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-display font-black uppercase text-[10px] tracking-tight ${done ? 'line-through' : ''}`}>
                    {label}
                </p>
                <p className="text-[10px] font-mono text-ink-soft leading-tight mt-0.5">{desc}</p>
                {action && <div className="mt-2">{action}</div>}
            </div>
        </div>
    )
}
