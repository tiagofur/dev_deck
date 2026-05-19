import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useClients, useCreateProject, useProjects } from '@devdeck/api-client'
import { CarpentryNav } from '../components/CarpentryNav'

export function CarpentryProjectsPage() {
  const navigate = useNavigate()
  const isNew = location.pathname.endsWith('/new')
  const { data: projects = [], isLoading, error } = useProjects()
  const { data: clients = [] } = useClients()
  const createProject = useCreateProject()
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        client_id: clientId || undefined,
        notes: notes.trim() || undefined,
        margin_percent: 0.35,
        advance_percent: 0.5,
      })
      showToast('Proyecto creado')
      navigate(`/projects/${project.id}`)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <CarpentryNav />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl uppercase">Proyectos</h1>
            <p className="font-mono text-sm text-ink-soft">Ambientes, muebles y cotizaciones.</p>
          </div>
          {!isNew && (
            <Button type="button" onClick={() => navigate('/projects/new')}>
              <span className="flex items-center gap-2"><Plus size={18} strokeWidth={3} />Nuevo proyecto</span>
            </Button>
          )}
        </section>

        {isNew && (
          <form onSubmit={submit} className="bg-bg-card border-3 border-ink shadow-hard p-5 max-w-2xl space-y-3">
            <h2 className="font-display font-black uppercase text-2xl">Nuevo proyecto</h2>
            <Field label="Nombre" value={name} onChange={setName} placeholder="Cocina integral" />
            <label className="block">
              <span className="block text-xs font-mono font-bold uppercase mb-1">Cliente</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full border-3 border-ink p-2 font-mono text-sm bg-white">
                <option value="">Sin cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-mono font-bold uppercase mb-1">Notas</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border-3 border-ink p-2 font-mono text-sm" />
            </label>
            <Button type="submit" disabled={createProject.isPending || !name.trim()}>
              {createProject.isPending ? 'Guardando...' : 'Crear proyecto'}
            </Button>
          </form>
        )}

        <section className="bg-bg-card border-3 border-ink shadow-hard p-5">
          <h2 className="font-display font-black uppercase text-2xl mb-4">Listado</h2>
          {isLoading && <p className="font-mono text-ink-soft">Cargando...</p>}
          {error && <p className="font-mono text-danger">{(error as Error).message}</p>}
          {!isLoading && projects.length === 0 && <p className="font-mono text-sm text-ink-soft">Sin proyectos todavia.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button key={p.id} type="button" onClick={() => navigate(`/projects/${p.id}`)} className="text-left border-3 border-ink bg-bg-elevated p-4 shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg transition-all">
                <ClipboardList size={20} strokeWidth={3} className="mb-3" />
                <h3 className="font-display font-bold uppercase text-lg">{p.name}</h3>
                <p className="font-mono text-xs text-ink-soft">{p.status}</p>
                <p className="font-mono text-xs mt-2">Margen {Math.round(p.margin_percent * 100)}% · Anticipo {Math.round(p.advance_percent * 100)}%</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono font-bold uppercase mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border-3 border-ink p-2 font-mono text-sm" />
    </label>
  )
}
