import { FileText } from 'lucide-react'
import { getConfig, quotePDFURL, useQuotes } from '@devdeck/api-client'
import { CarpentryNav } from '../components/CarpentryNav'

export function CarpentryQuotesPage() {
  const { data = [], isLoading, error } = useQuotes()

  return (
    <div className="min-h-screen bg-bg-primary">
      <CarpentryNav />
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="font-display font-black text-4xl uppercase mb-2">Cotizaciones</h1>
        <p className="font-mono text-sm text-ink-soft mb-6">Snapshots enviados al cliente.</p>

        {isLoading && <p className="font-mono text-ink-soft">Cargando...</p>}
        {error && <p className="font-mono text-danger">{(error as Error).message}</p>}
        {!isLoading && data.length === 0 && (
          <div className="border-3 border-dashed border-ink bg-bg-card p-10 text-center">
            <FileText size={48} strokeWidth={2} className="mx-auto mb-3 opacity-50" />
            <p className="font-display font-bold text-xl">Todavia no hay cotizaciones</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((q) => (
            <article key={q.id} className="bg-bg-card border-3 border-ink shadow-hard p-5">
              <FileText size={22} strokeWidth={3} className="mb-3" />
              <h2 className="font-display font-black uppercase text-xl">{q.quote_number}</h2>
              <p className="font-mono text-xs text-ink-soft">{new Date(q.created_at).toLocaleDateString()}</p>
              <div className="mt-4 font-mono text-sm space-y-1">
                <div className="flex justify-between"><span>Total</span><strong>{money(q.total)}</strong></div>
                <div className="flex justify-between"><span>Anticipo</span><strong>{money(q.advance)}</strong></div>
              </div>
              <a
                href={`${getConfig().baseUrl}${quotePDFURL(q.id)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block border-3 border-ink shadow-hard px-4 py-2 bg-accent-yellow font-display font-bold uppercase text-sm text-center"
              >
                Abrir PDF
              </a>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}
