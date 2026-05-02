import { ArrowLeft, Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import {
  getAccessToken,
  getConfig,
  logoutCurrentSession,
  setPreferences,
  usePreferences,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'

const APP_VERSION = '0.1.0'

export function SettingsPage() {
  const navigate = useNavigate()
  const prefs = usePreferences()
  const [tokenVisible, setTokenVisible] = useState(false)

  const cfg = getConfig()
  const apiUrl = cfg.baseUrl || 'same-origin'
  const apiToken = cfg.staticToken ?? ''
  const sessionActive = cfg.authMode === 'jwt' ? Boolean(getAccessToken()) : Boolean(apiToken)
  const maskedToken = apiToken
    ? `${apiToken.slice(0, 4)}${'•'.repeat(Math.max(0, apiToken.length - 8))}${apiToken.slice(-4)}`
    : '— sin configurar —'

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(apiToken)
      showToast('Token copiado')
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  async function logout() {
    await logoutCurrentSession()
    showToast('Sesión cerrada')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <SettingsIcon size={22} strokeWidth={3} />
          Settings
        </h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Personalidad */}
        <Section title="Personalidad">
          <Toggle
            label="Mostrar mascota"
            description="Snarkel aparece en la esquina inferior derecha y reacciona a tu uso."
            checked={prefs.mascotEnabled}
            onChange={(v) => {
              setPreferences({ mascotEnabled: v })
              showToast(v ? 'Mascota activada' : 'Mascota oculta')
            }}
          />
        </Section>

        {/* Conexión */}
        <Section title="Conexión">
          <Field label="API URL">
            <code className="font-mono text-sm break-all">{apiUrl}</code>
          </Field>
          {cfg.authMode === 'jwt' ? (
            <Field label="Sesión">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm">
                  {sessionActive ? 'OAuth activa' : 'Sin sesión'}
                </span>
                {sessionActive && (
                  <Button size="sm" variant="secondary" onClick={logout}>
                    Cerrar sesión
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-2 font-mono">
                Login real con proveedores OAuth y tokens JWT/refresh.
              </p>
            </Field>
          ) : (
            <Field label="API Token">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-sm">
                  {tokenVisible ? apiToken || '— sin configurar —' : maskedToken}
                </code>
                <button
                  type="button"
                  onClick={() => setTokenVisible((v) => !v)}
                  className="border-2 border-ink p-1 hover:bg-accent-yellow"
                  aria-label={tokenVisible ? 'Ocultar' : 'Mostrar'}
                >
                  {tokenVisible ? (
                    <EyeOff size={14} strokeWidth={3} />
                  ) : (
                    <Eye size={14} strokeWidth={3} />
                  )}
                </button>
                {apiToken && (
                  <Button size="sm" variant="secondary" onClick={copyToken}>
                    Copiar
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-2 font-mono">
                Configurado vía <code>VITE_API_URL</code> y <code>VITE_API_TOKEN</code>.
              </p>
            </Field>
          )}
        </Section>

        {/* About */}
        <Section title="Sobre">
          <div className="space-y-2">
            <p className="font-display font-black text-3xl uppercase">
              DevDeck
            </p>
            <p className="font-mono text-sm text-ink-soft">v{APP_VERSION}</p>
            <p className="text-sm mt-3">
              Tu directorio personal de repos y herramientas favoritas. Hermoso, divertido,
              siempre a mano.
            </p>
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card border-3 border-ink shadow-hard p-5">
      <h2 className="font-display font-black uppercase text-sm tracking-widest mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-display font-bold text-xs uppercase tracking-wider mb-2 text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  )
}

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-display font-bold text-base">{label}</p>
        {description && (
          <p className="text-xs text-ink-soft font-mono mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-8 border-3 border-ink shadow-hard-sm shrink-0 transition-colors ${
          checked ? 'bg-accent-lime' : 'bg-bg-elevated'
        }`}
      >
        <span
          className={`absolute top-0 w-6 h-6 bg-bg-card border-2 border-ink transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
