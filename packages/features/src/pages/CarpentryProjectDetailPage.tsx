import { FormEvent, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import {
  quotePDFURL,
  useCreateCostLine,
  useCreateEnvironment,
  useCreateFurniture,
  useCreateQuote,
  useMaterials,
  useProject,
  type CostLineType,
  type Material,
} from '@devdeck/api-client'
import { getConfig } from '@devdeck/api-client'
import { CarpentryNav } from '../components/CarpentryNav'

export function CarpentryProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useProject(id)
  const { data: materials = [] } = useMaterials({ includeInactive: false })
  const createEnv = useCreateEnvironment()
  const createFurniture = useCreateFurniture()
  const createLine = useCreateCostLine()
  const createQuote = useCreateQuote()

  async function addEnvironment(name: string) {
    if (!id || !name.trim()) return
    try {
      await createEnv.mutateAsync({ projectId: id, input: { name: name.trim() } })
      showToast('Ambiente agregado')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function addFurniture(environmentId: string, name: string) {
    if (!name.trim()) return
    try {
      await createFurniture.mutateAsync({ environmentId, input: { name: name.trim(), waste_percent: 0.1 } })
      showToast('Mueble agregado')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function addLine(furnitureId: string, input: { materialId?: string; lineType: CostLineType; name: string; unit: string; quantity: number; unitCost: number }) {
    try {
      await createLine.mutateAsync({
        furnitureId,
        input: {
          material_id: input.materialId || undefined,
          line_type: input.lineType,
          name: input.name,
          unit: input.unit,
          quantity: input.quantity,
          unit_cost_snapshot: input.unitCost,
        },
      })
      showToast('Linea agregada')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function quote() {
    if (!id) return
    try {
      await createQuote.mutateAsync({ projectId: id })
      showToast('Cotizacion generada')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <CarpentryNav />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <button type="button" onClick={() => navigate('/projects')} className="font-mono text-sm hover:text-accent-orange inline-flex items-center gap-2">
          <ArrowLeft size={16} strokeWidth={3} />
          Volver a proyectos
        </button>

        {isLoading && <p className="font-mono text-ink-soft">Cargando...</p>}
        {error && <p className="font-mono text-danger">{(error as Error).message}</p>}

        {data && (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
              <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
                <p className="font-mono text-xs text-ink-soft uppercase">{data.project.status}</p>
                <h1 className="font-display font-black text-4xl uppercase">{data.project.name}</h1>
                <p className="font-mono text-sm text-ink-soft mt-2">
                  Cliente: {data.client?.name || 'Sin cliente'} · Margen {Math.round(data.project.margin_percent * 100)}%
                </p>
              </div>
              <TotalsCard totals={data.totals} onQuote={quote} quoting={createQuote.isPending} quoteId={data.latest_quote?.id} />
            </section>

            <AddEnvironmentForm onAdd={addEnvironment} saving={createEnv.isPending} />

            {data.environments.length === 0 ? (
              <div className="border-3 border-dashed border-ink p-10 text-center bg-bg-card">
                <p className="font-display font-bold text-xl mb-2">Agrega el primer ambiente</p>
                <p className="font-mono text-sm text-ink-soft">Ej: cocina, closet, bano, oficina.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {data.environments.map((env) => (
                  <section key={env.id} className="bg-bg-card border-3 border-ink shadow-hard p-5">
                    <h2 className="font-display font-black uppercase text-2xl">{env.name}</h2>
                    <AddFurnitureForm environmentId={env.id} onAdd={addFurniture} saving={createFurniture.isPending} />
                    <div className="mt-4 space-y-4">
                      {(env.furniture ?? []).map((f) => (
                        <article key={f.id} className="border-3 border-ink bg-bg-elevated p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="font-display font-bold uppercase text-xl">{f.name}</h3>
                              <p className="font-mono text-xs text-ink-soft">
                                {f.width_mm} x {f.height_mm} x {f.depth_mm} mm · desperdicio {Math.round(f.waste_percent * 100)}%
                              </p>
                            </div>
                          </div>
                          <CostLines lines={f.cost_lines ?? []} />
                          <AddLineForm furnitureId={f.id} materials={materials} onAdd={addLine} saving={createLine.isPending} />
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function TotalsCard({ totals, onQuote, quoting, quoteId }: { totals: { material_cost: number; waste_cost: number; labor_cost: number; base_cost: number; margin_amount: number; total: number; advance: number }; onQuote: () => void; quoting: boolean; quoteId?: string }) {
  const pdfHref = useMemo(() => quoteId ? `${getConfig().baseUrl}${quotePDFURL(quoteId)}` : '', [quoteId])
  return (
    <aside className="bg-bg-card border-3 border-ink shadow-hard p-5">
      <h2 className="font-display font-black uppercase text-xl mb-3">Resumen</h2>
      <Rows rows={[
        ['Materiales', totals.material_cost],
        ['Desperdicio', totals.waste_cost],
        ['Mano de obra', totals.labor_cost],
        ['Base', totals.base_cost],
        ['Margen', totals.margin_amount],
        ['Total', totals.total],
        ['Anticipo', totals.advance],
      ]} />
      <div className="flex flex-col gap-2 mt-4">
        <Button type="button" onClick={onQuote} disabled={quoting}>{quoting ? 'Generando...' : 'Generar cotizacion'}</Button>
        {quoteId && (
          <a href={pdfHref} target="_blank" rel="noreferrer" className="border-3 border-ink shadow-hard px-5 py-3 bg-bg-card font-display font-bold uppercase text-sm text-center">
            <span className="inline-flex items-center gap-2"><FileText size={16} strokeWidth={3} />PDF</span>
          </a>
        )}
      </div>
    </aside>
  )
}

function Rows({ rows }: { rows: Array<[string, number]> }) {
  return (
    <div className="space-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 font-mono text-sm">
          <span>{label}</span>
          <strong>{money(value)}</strong>
        </div>
      ))}
    </div>
  )
}

function AddEnvironmentForm({ onAdd, saving }: { onAdd: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(name); setName('') }} className="bg-bg-card border-3 border-ink shadow-hard p-4 flex gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo ambiente: cocina" className="flex-1 border-3 border-ink p-2 font-mono text-sm" />
      <Button type="submit" disabled={saving || !name.trim()}><Plus size={16} strokeWidth={3} /></Button>
    </form>
  )
}

function AddFurnitureForm({ environmentId, onAdd, saving }: { environmentId: string; onAdd: (environmentId: string, name: string) => void; saving: boolean }) {
  const [name, setName] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(environmentId, name); setName('') }} className="mt-3 flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo mueble: alacena" className="flex-1 border-3 border-ink p-2 font-mono text-sm" />
      <Button type="submit" size="sm" disabled={saving || !name.trim()}>Agregar</Button>
    </form>
  )
}

function CostLines({ lines }: { lines: Array<{ id: string; line_type: string; name: string; quantity: number; unit: string; unit_cost_snapshot: number }> }) {
  if (lines.length === 0) return <p className="font-mono text-sm text-ink-soft mt-3">Sin costos todavia.</p>
  return (
    <div className="mt-3 divide-y-2 divide-ink bg-bg-card border-2 border-ink">
      {lines.map((line) => (
        <div key={line.id} className="p-2 flex justify-between gap-3 font-mono text-sm">
          <span>{line.name} · {line.quantity} {line.unit}</span>
          <strong>{money(line.quantity * line.unit_cost_snapshot)}</strong>
        </div>
      ))}
    </div>
  )
}

function AddLineForm({ furnitureId, materials, onAdd, saving }: { furnitureId: string; materials: Material[]; onAdd: (furnitureId: string, input: { materialId?: string; lineType: CostLineType; name: string; unit: string; quantity: number; unitCost: number }) => void; saving: boolean }) {
  const [materialId, setMaterialId] = useState('')
  const [lineType, setLineType] = useState<CostLineType>('material')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('pieza')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')

  function selectMaterial(id: string) {
    setMaterialId(id)
    const m = materials.find((mat) => mat.id === id)
    if (!m) return
    setName(m.name)
    setUnit(m.unit)
    setUnitCost(String(m.unit_cost_mxn))
    setLineType(m.category === 'labor' ? 'labor' : m.category === 'hardware' ? 'hardware' : m.category === 'accessory' ? 'accessory' : 'material')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(furnitureId, {
      materialId,
      lineType,
      name: name.trim(),
      unit: unit.trim() || 'pieza',
      quantity: Number(quantity) || 1,
      unitCost: Number(unitCost) || 0,
    })
    setMaterialId('')
    setName('')
    setQuantity('1')
    setUnitCost('')
  }

  return (
    <form onSubmit={submit} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-2">
      <select value={materialId} onChange={(e) => selectMaterial(e.target.value)} className="border-3 border-ink p-2 font-mono text-xs bg-white md:col-span-2">
        <option value="">Manual / catalogo</option>
        {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <select value={lineType} onChange={(e) => setLineType(e.target.value as CostLineType)} className="border-3 border-ink p-2 font-mono text-xs bg-white">
        <option value="material">Material</option>
        <option value="hardware">Herraje</option>
        <option value="accessory">Accesorio</option>
        <option value="labor">Mano de obra</option>
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="border-3 border-ink p-2 font-mono text-xs" />
      <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Cant." type="number" className="border-3 border-ink p-2 font-mono text-xs" />
      <input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="$" type="number" className="border-3 border-ink p-2 font-mono text-xs" />
      <Button type="submit" size="sm" disabled={saving || !name.trim()}>Agregar costo</Button>
    </form>
  )
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}
