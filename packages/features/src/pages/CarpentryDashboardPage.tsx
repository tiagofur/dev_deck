import { Link, useNavigate } from 'react-router-dom'
import { Boxes, ClipboardList, FileText, Plus, Users } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { useCarpentryDashboard } from '@devdeck/api-client'
import { CarpentryNav } from '../components/CarpentryNav'

export function CarpentryDashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useCarpentryDashboard()

  return (
    <div className="min-h-screen bg-bg-primary">
      <CarpentryNav />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl uppercase">Cotizador</h1>
            <p className="font-mono text-sm text-ink-soft mt-1">
              Proyectos, muebles, materiales y cotizaciones para taller pequeno.
            </p>
          </div>
          <Button type="button" onClick={() => navigate('/projects/new')}>
            <span className="flex items-center gap-2"><Plus size={18} strokeWidth={3} />Nuevo proyecto</span>
          </Button>
        </section>

        {error && <ErrorBox message={(error as Error).message} />}
        {isLoading && <p className="font-mono text-ink-soft">Cargando...</p>}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Metric title="Proyectos abiertos" value={data.open_projects} />
              <Metric title="Cotizaciones" value={data.quoted_count} />
              <Metric title="Total cotizado" value={money(data.total_quoted)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickLink to="/catalog" icon={Boxes} title="Catalogo" text="Tableros, cintillas, herrajes y mano de obra." />
              <QuickLink to="/clients" icon={Users} title="Clientes" text="Datos de contacto y notas de venta." />
              <QuickLink to="/quotes" icon={FileText} title="Cotizaciones" text="PDFs y snapshots enviados." />
            </div>

            <section className="bg-bg-card border-3 border-ink shadow-hard p-5">
              <h2 className="font-display font-black uppercase text-xl mb-4 flex items-center gap-2">
                <ClipboardList size={20} strokeWidth={3} />
                Proyectos recientes
              </h2>
              {data.recent_projects.length === 0 ? (
                <div className="border-3 border-dashed border-ink p-8 text-center">
                  <p className="font-display font-bold text-lg mb-3">Todavia no hay proyectos</p>
                  <Button type="button" variant="accent" onClick={() => navigate('/projects/new')}>
                    Crear primer proyecto
                  </Button>
                </div>
              ) : (
                <div className="divide-y-2 divide-ink">
                  {data.recent_projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-accent-yellow/20"
                    >
                      <span>
                        <span className="block font-display font-bold uppercase">{p.name}</span>
                        <span className="font-mono text-xs text-ink-soft">{p.status}</span>
                      </span>
                      <span className="font-mono text-xs text-ink-soft">{new Date(p.updated_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
      <p className="font-mono text-xs text-ink-soft uppercase">{title}</p>
      <p className="font-display font-black text-3xl mt-2">{value}</p>
    </div>
  )
}

function QuickLink({ to, icon: Icon, title, text }: { to: string; icon: typeof Boxes; title: string; text: string }) {
  return (
    <Link to={to} className="bg-bg-card border-3 border-ink shadow-hard p-5 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg transition-all">
      <Icon size={24} strokeWidth={3} className="mb-3" />
      <p className="font-display font-black uppercase text-lg">{title}</p>
      <p className="font-mono text-sm text-ink-soft mt-1">{text}</p>
    </Link>
  )
}

function ErrorBox({ message }: { message: string }) {
  return <div className="bg-danger text-white border-3 border-ink p-4 font-mono">{message}</div>
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}
