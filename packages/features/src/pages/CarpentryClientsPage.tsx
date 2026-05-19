import { FormEvent, useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useClients, useCreateClient } from '@devdeck/api-client'
import { CarpentryNav } from '../components/CarpentryNav'

export function CarpentryClientsPage() {
  const { data = [], isLoading, error } = useClients()
  const createClient = useCreateClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createClient.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNotes('')
      showToast('Cliente creado')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <CarpentryNav />
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        <form onSubmit={submit} className="bg-bg-card border-3 border-ink shadow-hard p-5 space-y-3 h-fit">
          <h1 className="font-display font-black text-2xl uppercase flex items-center gap-2">
            <Plus size={20} strokeWidth={3} />
            Nuevo cliente
          </h1>
          <Field label="Nombre" value={name} onChange={setName} placeholder="Ana Lopez" />
          <Field label="Telefono" value={phone} onChange={setPhone} placeholder="8112345678" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="cliente@email.com" />
          <Field label="Direccion" value={address} onChange={setAddress} placeholder="Opcional" />
          <label className="block">
            <span className="block text-xs font-mono font-bold uppercase mb-1">Notas</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border-3 border-ink p-2 font-mono text-sm" />
          </label>
          <Button type="submit" disabled={createClient.isPending || !name.trim()}>
            {createClient.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>

        <section className="bg-bg-card border-3 border-ink shadow-hard p-5">
          <h2 className="font-display font-black uppercase text-2xl mb-4">Clientes</h2>
          {isLoading && <p className="font-mono text-ink-soft">Cargando...</p>}
          {error && <p className="font-mono text-danger">{(error as Error).message}</p>}
          {!isLoading && data.length === 0 && <p className="font-mono text-sm text-ink-soft">Sin clientes todavia.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map((c) => (
              <article key={c.id} className="border-3 border-ink p-4 bg-bg-elevated">
                <UserRound size={18} strokeWidth={3} className="mb-2" />
                <h3 className="font-display font-bold uppercase text-lg">{c.name}</h3>
                <p className="font-mono text-xs text-ink-soft">{c.phone || 'Sin telefono'}</p>
                {c.email && <p className="font-mono text-xs text-ink-soft">{c.email}</p>}
                {c.address && <p className="font-mono text-xs mt-2">{c.address}</p>}
                {c.notes && <p className="font-mono text-xs mt-2 text-ink-soft">{c.notes}</p>}
              </article>
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
