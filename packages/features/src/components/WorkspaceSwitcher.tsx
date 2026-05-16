import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe, Users, Plus, Check } from 'lucide-react'
import { 
  useUserOrgs, 
  useCreateOrg, 
  usePreferences, 
  setPreferences 
} from '@devdeck/api-client'
import { useQueryClient } from '@tanstack/react-query'

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const { data: orgsRes, isLoading } = useUserOrgs()
  const createOrg = useCreateOrg()
  const { activeOrgId } = usePreferences()
  const qc = useQueryClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const orgs = orgsRes?.orgs || []
  const activeOrg = orgs.find(o => o.id === activeOrgId)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSwitch(id: string | null) {
    setPreferences({ activeOrgId: id })
    setOpen(false)
    // Invalidate everything to refresh data for the new context
    qc.invalidateQueries()
  }

  async function handleCreate() {
    const name = window.prompt('Nombre del nuevo equipo:')
    if (!name) return
    try {
      const newOrg = await createOrg.mutateAsync(name)
      handleSwitch(newOrg.id)
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 border-3 border-ink shadow-hard transition-all active:shadow-none active:translate-x-0.5 active:translate-y-0.5
          ${open ? 'bg-accent-yellow' : 'bg-bg-card hover:bg-bg-elevated'}
        `}
      >
        {activeOrg ? (
          <Users size={16} strokeWidth={3} className="text-accent-pink" />
        ) : (
          <Globe size={16} strokeWidth={3} className="text-accent-cyan" />
        )}
        <span className="font-display font-black uppercase text-[10px] tracking-widest truncate max-w-[100px]">
          {activeOrg ? activeOrg.name : 'Personal'}
        </span>
        <ChevronDown size={14} strokeWidth={3} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-3 w-56 bg-bg-card border-3 border-ink shadow-hard-lg z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b-2 border-ink bg-bg-elevated font-mono text-[9px] uppercase font-black text-ink-soft">
            Workspaces
          </div>
          
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            <SwitcherItem 
              active={activeOrgId === null} 
              onClick={() => handleSwitch(null)} 
              icon={<Globe size={14} />} 
              label="Vault Personal" 
            />
            
            {orgs.map(org => (
              <SwitcherItem 
                key={org.id}
                active={activeOrgId === org.id} 
                onClick={() => handleSwitch(org.id)} 
                icon={<Users size={14} />} 
                label={org.name} 
              />
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={createOrg.isPending}
            className="w-full flex items-center gap-2 p-3 border-t-2 border-ink hover:bg-accent-lime/10 transition-colors text-left"
          >
            <Plus size={14} strokeWidth={3} />
            <span className="font-display font-black uppercase text-[10px] tracking-widest">Crear Equipo</span>
          </button>
        </div>
      )}
    </div>
  )
}

function SwitcherItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 hover:bg-bg-primary transition-colors text-left group`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1 border-2 border-ink ${active ? 'bg-accent-yellow' : 'bg-bg-card'}`}>
          {icon}
        </div>
        <span className={`font-display font-bold uppercase text-[10px] tracking-wider ${active ? 'text-ink' : 'text-ink-soft'}`}>
          {label}
        </span>
      </div>
      {active && <Check size={14} strokeWidth={4} className="text-accent-lime" />}
    </button>
  )
}
