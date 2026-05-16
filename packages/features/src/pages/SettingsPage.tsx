import { ArrowLeft, Bell, Check, Eye, EyeOff, Laptop, Settings as SettingsIcon, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, confirm } from '@devdeck/ui'
import {
  getAccessToken,
  getConfig,
  logoutCurrentSession,
  setPreferences,
  useDeleteDevice,
  useDevices,
  useMe,
  useUpdateMe,
  usePreferences,
  useAPIKeys,
  useCreateAPIKey,
  useDeleteAPIKey,
  useCustomEnrichers,
  useCreateCustomEnricher,
  useDeleteCustomEnricher,
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { WebhookManager } from '../components/WebhookManager'
import { PluginGallery } from '../components/PluginGallery'

const APP_VERSION = '0.1.0'

export function SettingsPage() {
  const navigate = useNavigate()
  const prefs = usePreferences()
  const { data: me } = useMe()
  const updateMe = useUpdateMe()
  
  const [tokenVisible, setTokenVisible] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState('')

  async function handleSaveBio() {
    try {
      await updateMe.mutateAsync({ bio })
      setEditingBio(false)
      showToast('Perfil actualizado')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

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
        {/* Perfil */}
        <Section title="Mi Perfil">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border-2 border-ink shadow-hard-sm overflow-hidden bg-accent-yellow shrink-0">
                {me?.avatar_url && (
                  <img src={me.avatar_url} alt={me.display_name} className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="font-display font-black text-xl uppercase leading-none">{me?.display_name || 'Cargando…'}</p>
                <p className="font-mono text-[10px] text-ink-soft uppercase font-bold mt-1">
                  Plan: <span className="text-accent-pink">{me?.plan || 'free'}</span>
                </p>
              </div>
            </div>

            <Field label="Biografía">
              {editingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full border-2 border-ink p-3 font-mono text-sm min-h-[100px] focus:outline-none focus:bg-accent-yellow/5"
                    placeholder="Contanos un poco sobre vos…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveBio} disabled={updateMe.isPending}>
                      {updateMe.isPending ? 'Guardando…' : 'Guardar'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingBio(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <p className="text-sm font-medium italic text-ink-soft min-h-[1.5em]">
                    {me?.bio ? `"${me.bio}"` : 'Sin biografía todavía.'}
                  </p>
                  <button
                    onClick={() => {
                      setBio(me?.bio || '')
                      setEditingBio(true)
                    }}
                    className="mt-2 text-[10px] font-mono uppercase font-bold underline hover:text-accent-pink"
                  >
                    Editar biografía
                  </button>
                </div>
              )}
            </Field>

            {me?.username && (
              <Field label="URL Pública">
                <p className="text-xs font-mono break-all text-ink-soft">
                  devdeck.ai/u/{me.username}
                </p>
              </Field>
            )}

            {me?.role === 'admin' && (
              <div className="pt-4 border-t-2 border-ink/10">
                <Button variant="accent" className="w-full" onClick={() => navigate('/admin')}>
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={16} strokeWidth={3} />
                    Panel de Administración
                  </span>
                </Button>
              </div>
            )}
          </div>
        </Section>

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

        {/* Notificaciones */}
        <Section title="Notificaciones">
          <PushPermissionRequest />
        </Section>

        {/* Dispositivos */}
        <Section title="Mis Dispositivos">
          <DeviceList currentClientId={prefs.clientId} />
        </Section>

        {/* Desarrollador */}
        <Section title="Desarrollador: API Keys">
          <APIKeyManager />
        </Section>

        <Section title="Desarrollador: Plugins de Enriquecimiento">
          <p className="text-[10px] text-ink-soft mb-4 italic">
            Configurá webhooks externos para extraer metadata de URLs específicas.
          </p>
          <CustomEnricherManager />
        </Section>

        <Section title="Desarrollador: Webhooks de Salida">
          <p className="text-[10px] text-ink-soft mb-4 italic">
            Suscribite a eventos de DevDeck para notificar a sistemas externos (ej: Slack, Zapier).
          </p>
          <WebhookManager />
        </Section>

        <Section title="Desarrollador: Galería de Plugins">
          <PluginGallery />
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

function DeviceList({ currentClientId }: { currentClientId: string }) {
  const { data: devices = [], isLoading } = useDevices()
  const deleteDevice = useDeleteDevice()

  if (isLoading) return <div className="font-mono text-xs text-ink-soft">Cargando dispositivos…</div>

  async function handleDelete(clientId: string, name: string) {
    const ok = await confirm({
      title: 'Desvincular dispositivo',
      message: `¿Estás seguro de que querés desvincular "${name}"? El dispositivo tendrá que volver a loguearse para sincronizar.`,
      confirmLabel: 'Desvincular',
      variant: 'danger',
    })
    if (!ok) return

    try {
      await deleteDevice.mutateAsync(clientId)
      showToast('Dispositivo desvinculado')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="space-y-3">
      {devices.map((d) => {
        const isCurrent = d.client_id === currentClientId
        return (
          <div
            key={d.client_id}
            className={`flex items-center gap-3 p-3 border-2 border-ink shadow-hard-sm ${
              isCurrent ? 'bg-accent-yellow/10' : 'bg-bg-elevated'
            }`}
          >
            <div className="border-2 border-ink p-1.5 bg-bg-card">
              {d.device_type === 'desktop' ? <Laptop size={14} /> : <Smartphone size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display font-bold text-xs uppercase truncate">{d.name}</p>
                {isCurrent && (
                  <span className="text-[9px] font-mono bg-accent-lime border border-ink px-1 py-0 uppercase font-black">
                    Este
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-ink-soft truncate">
                Visto: {new Date(d.last_seen_at).toLocaleString()}
              </p>
            </div>
            {!isCurrent && (
              <button
                onClick={() => handleDelete(d.client_id, d.name)}
                title="Desvincular"
                className="p-1 hover:bg-accent-pink border-2 border-transparent hover:border-ink transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PushPermissionRequest() {
  const [status, setStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  async function request() {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones', 'error')
      return
    }
    const res = await Notification.requestPermission()
    setStatus(res)
    if (res === 'granted') {
      showToast('Notificaciones activadas')
      new Notification('¡DevDeck Conectado!', {
        body: 'Ahora recibirás alertas importantes en tu dispositivo.',
        icon: '/pwa-192x192.png'
      })
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-display font-bold text-base flex items-center gap-2">
           Notificaciones del Sistema
           {status === 'granted' && <Check size={16} className="text-accent-lime" strokeWidth={4} />}
        </p>
        <p className="text-xs text-ink-soft font-mono mt-1">
          {status === 'granted' 
            ? 'Activadas. Recibirás alertas incluso con la app cerrada.' 
            : 'Desactivadas. Habilitalas para no perderte nada.'}
        </p>
      </div>
      
      {status !== 'granted' && (
        <Button size="sm" onClick={request} variant="secondary">
          Habilitar
        </Button>
      )}
    </div>
  )
}

function APIKeyManager() {
  const { data: keysRes, isLoading } = useAPIKeys()
  const createKey = useCreateAPIKey()
  const deleteKey = useDeleteAPIKey()
  const [newToken, setNewToken] = useState<string | null>(null)

  const keys = keysRes?.keys || []

  async function handleCreate() {
    const name = window.prompt('Nombre de la API Key (ej: CLI de casa):')
    if (!name) return
    try {
      const res = await createKey.mutateAsync(name)
      setNewToken(res.token)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      {newToken && (
        <div className="bg-accent-yellow border-3 border-ink p-4 shadow-hard animate-in zoom-in duration-300">
           <p className="text-xs font-bold uppercase mb-2">¡Nueva API Key creada!</p>
           <p className="text-[10px] mb-3 leading-tight">Copiá este token ahora. No se volverá a mostrar por seguridad.</p>
           <div className="flex items-center gap-2">
              <code className="bg-white border-2 border-ink px-3 py-2 text-sm font-mono flex-1 break-all select-all">
                {newToken}
              </code>
              <button 
                onClick={() => setNewToken(null)}
                className="font-mono text-[10px] uppercase font-black underline"
              >
                Cerrar
              </button>
           </div>
        </div>
      )}

      <div className="space-y-2">
        {keys.map(k => (
          <div key={k.id} className="flex items-center justify-between p-3 border-2 border-ink bg-bg-primary">
            <div>
              <p className="font-display font-bold text-xs uppercase">{k.name}</p>
              <p className="font-mono text-[9px] text-ink-soft">
                Usada: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Nunca'}
              </p>
            </div>
            <button 
              onClick={() => deleteKey.mutate(k.id)}
              className="p-1.5 hover:bg-accent-pink border-2 border-transparent hover:border-ink transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <Button onClick={handleCreate} disabled={createKey.isPending} className="w-full" size="sm">
        Generar Nueva Key
      </Button>
    </div>
  )
}

function CustomEnricherManager() {
  const { data: encRes, isLoading } = useCustomEnrichers()
  const createEnc = useCreateCustomEnricher()
  const deleteEnc = useDeleteCustomEnricher()

  const enrichers = encRes?.enrichers || []

  async function handleCreate() {
    const name = window.prompt('Nombre del Plugin (ej: Rust Crates):')
    const pattern = window.prompt('URL Pattern (Regex, ej: ^https://crates\\.io/):')
    const endpoint = window.prompt('Endpoint URL (Webhook):')
    
    if (!name || !pattern || !endpoint) return
    
    try {
      await createEnc.mutateAsync({ name, url_pattern: pattern, endpoint_url: endpoint })
      showToast('Plugin registrado')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {enrichers.map(e => (
          <div key={e.id} className="p-3 border-2 border-ink bg-bg-primary space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-display font-black text-[10px] uppercase tracking-widest">{e.name}</p>
              <button 
                onClick={() => deleteEnc.mutate(e.id)}
                className="p-1 hover:bg-accent-pink transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="font-mono text-[9px] space-y-1">
              <p><span className="text-ink-soft">Pattern:</span> {e.url_pattern}</p>
              <p className="truncate"><span className="text-ink-soft">Webhook:</span> {e.endpoint_url}</p>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleCreate} disabled={createEnc.isPending} className="w-full" size="sm" variant="secondary">
        + Registrar Plugin HTTP
      </Button>
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
