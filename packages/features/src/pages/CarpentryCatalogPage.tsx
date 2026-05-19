import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import {
  useCreateMaterial,
  useMaterials,
  useUpdateMaterial,
  type Material,
  type MaterialCategory,
} from '@devdeck/api-client'
import { CarpentryNav } from '../components/CarpentryNav'

const categories: Array<{ key: MaterialCategory; label: string; unit: string }> = [
  { key: 'board', label: 'Tableros', unit: 'pieza' },
  { key: 'edge_band', label: 'Cintillas', unit: 'metro' },
  { key: 'hardware', label: 'Herrajes', unit: 'pieza' },
  { key: 'accessory', label: 'Accesorios', unit: 'pieza' },
  { key: 'labor', label: 'Mano de obra', unit: 'servicio' },
]

export function CarpentryCatalogPage() {
  const [category, setCategory] = useState<MaterialCategory>('board')
  const { data = [], isLoading, error } = useMaterials({ category, includeInactive: true })
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()
  const selected = categories.find((c) => c.key === category) ?? categories[0]

  async function create(input: MaterialDraft) {
    try {
      await createMaterial.mutateAsync({ ...input, category })
      showToast('Material creado')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function toggle(material: Material) {
    try {
      await updateMaterial.mutateAsync({ id: material.id, input: { active: !material.active } })
      showToast(material.active ? 'Material desactivado' : 'Material activado')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <CarpentryNav />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl uppercase">Catalogo</h1>
            <p className="font-mono text-sm text-ink-soft">Precios base en MXN para cotizar rapido.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs ${
                category === c.key ? 'bg-accent-lime shadow-hard-sm' : 'bg-bg-card hover:bg-accent-yellow/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <MaterialForm defaultUnit={selected.unit} onSubmit={create} saving={createMaterial.isPending} />

          <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
            <h2 className="font-display font-black uppercase text-xl mb-4">{selected.label}</h2>
            {isLoading && <p className="font-mono text-ink-soft">Cargando...</p>}
            {error && <p className="font-mono text-danger">{(error as Error).message}</p>}
            {!isLoading && data.length === 0 && (
              <p className="font-mono text-sm text-ink-soft">Sin registros todavia.</p>
            )}
            <div className="divide-y-2 divide-ink">
              {data.map((m) => (
                <div key={m.id} className={`py-3 flex items-center justify-between gap-4 ${m.active ? '' : 'opacity-50'}`}>
                  <div>
                    <p className="font-display font-bold uppercase">{m.name}</p>
                    <p className="font-mono text-xs text-ink-soft">
                      {money(m.unit_cost_mxn)} / {m.unit}
                      {m.supplier ? ` · ${m.supplier}` : ''}
                    </p>
                    {m.notes && <p className="font-mono text-xs mt-1">{m.notes}</p>}
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => toggle(m)} disabled={updateMaterial.isPending}>
                    {m.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

interface MaterialDraft {
  name: string
  unit: string
  unit_cost_mxn: number
  supplier?: string
  notes?: string
}

function MaterialForm({ defaultUnit, onSubmit, saving }: { defaultUnit: string; onSubmit: (input: MaterialDraft) => void; saving: boolean }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState(defaultUnit)
  const [unitCost, setUnitCost] = useState('')
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      unit: unit.trim() || defaultUnit,
      unit_cost_mxn: Number(unitCost) || 0,
      supplier: supplier.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setName('')
    setUnit(defaultUnit)
    setUnitCost('')
    setSupplier('')
    setNotes('')
  }

  return (
    <form onSubmit={submit} className="bg-bg-card border-3 border-ink shadow-hard p-5 space-y-3">
      <h2 className="font-display font-black uppercase text-xl flex items-center gap-2">
        <Plus size={20} strokeWidth={3} />
        Nuevo
      </h2>
      <Field label="Nombre" value={name} onChange={setName} placeholder="Melamina blanca 18mm" />
      <Field label="Unidad" value={unit} onChange={setUnit} placeholder={defaultUnit} />
      <Field label="Costo MXN" value={unitCost} onChange={setUnitCost} placeholder="1200" type="number" />
      <Field label="Proveedor" value={supplier} onChange={setSupplier} placeholder="Opcional" />
      <label className="block">
        <span className="block text-xs font-mono font-bold uppercase mb-1">Notas</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border-3 border-ink p-2 font-mono text-sm" />
      </label>
      <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Guardando...' : 'Guardar'}</Button>
    </form>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono font-bold uppercase mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border-3 border-ink p-2 font-mono text-sm" />
    </label>
  )
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}
