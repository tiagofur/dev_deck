import { ArrowLeft, Check, Eye, EyeOff, Globe, Laptop, Settings as SettingsIcon, Smartphone, Trash2 } from 'lucide-react'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, confirm } from '@devdeck/ui'
import { AppShell } from '../components/AppShell'
import {
  getAccessToken,
  getConfig,
  logoutCurrentSession,
  setPreferences,
  useDeleteDevice,
  useDevices,
  useMe,
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
  useOrgSAML,
  useUpdateOrgSAML,
  useGenerateSCIMToken,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { useTranslation, setLanguage, type AppLanguage } from '@devdeck/i18n'
import { WebhookManager } from '../components/WebhookManager'
import { IntegrationsList } from '../components/IntegrationsList'
import { ImportStarsSection } from '../components/ImportStarsSection'
import { ExportVaultSection } from '../components/ExportVaultSection'
import { DemoDataSection } from '../components/DemoDataSection'
import { OrgInsights } from '../components/OrgInsights'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const prefs = usePreferences()
  const { data: me } = useMe()
  
  const [tokenVisible, setTokenVisible] = useState(false)

  const cfg = getConfig()
  const apiUrl = cfg.baseUrl || 'same-origin'
  const apiToken = cfg.staticToken ?? ''
  const sessionActive = cfg.authMode === 'jwt' ? Boolean(getAccessToken()) : Boolean(apiToken)
  const maskedToken = apiToken
    ? `${apiToken.slice(0, 4)}${'•'.repeat(Math.max(0, apiToken.length - 8))}${apiToken.slice(-4)}`
    : t('settings.not_configured')

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(apiToken)
      showToast(t('common.token_copied'))
    } catch {
      showToast(t('common.error'), 'error')
    }
  }

  async function logout() {
    await logoutCurrentSession()
    showToast(t('common.logout_msg'))
    navigate('/login')
  }

  return (
    <AppShell contentClassName="flex-1 overflow-y-auto">
      <div className="min-h-full bg-bg-primary">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <SettingsIcon size={22} strokeWidth={3} />
          {t('settings.title')}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Personalidad */}
        <Section title={t('settings.personality')}>
          <Toggle
            label={t('settings.show_mascot')}
            description={t('settings.mascot_desc')}
            checked={prefs.mascotEnabled}
            onChange={(v) => {
              setPreferences({ mascotEnabled: v })
              showToast(v ? t('settings.mascot_enabled') : t('settings.mascot_disabled'))
            }}
          />
        </Section>

        {/* Idioma */}
        <Section title={t('settings.language')}>
          <Field label={t('settings.language_desc')}>
            <div className="flex gap-2">
              {(['en', 'es'] as AppLanguage[]).map((lng) => {
                const active = i18n.language?.startsWith(lng)
                return (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => {
                      void setLanguage(lng)
                      showToast(t('settings.language_changed'))
                    }}
                    aria-pressed={active}
                    className={`flex items-center gap-2 border-3 border-ink px-4 py-2 font-display font-bold uppercase text-sm shadow-hard-sm transition-colors ${
                      active ? 'bg-accent-lime' : 'bg-bg-primary hover:bg-bg-card'
                    }`}
                  >
                    {active && <Check size={16} strokeWidth={3} />}
                    {lng === 'en' ? 'English' : 'Español'}
                  </button>
                )
              })}
            </div>
          </Field>
        </Section>

        {/* Notificaciones */}
        <Section title={t('settings.notifications')}>
          <PushPermissionRequest />
        </Section>

        {/* Dispositivos */}
        <Section title={t('settings.devices')}>
          <DeviceList currentClientId={prefs.clientId} />
        </Section>

        {/* Desarrollador */}
        <Section title={`${t('settings.developer')}: ${t('settings.api_keys')}`}>
          <APIKeyManager />
        </Section>

        <Section title={`${t('settings.developer')}: ${t('settings.enrichment_plugins')}`}>
          <p className="text-[10px] text-ink-soft mb-4 italic">
            {t('settings.enrichment_desc')}
          </p>
          <CustomEnricherManager />
        </Section>

        <Section title={`${t('settings.developer')}: ${t('settings.output_webhooks')}`}>
          <p className="text-[10px] text-ink-soft mb-4 italic">
            {t('settings.output_webhooks_desc')}
          </p>
          <WebhookManager />
        </Section>

        <Section title={t('settings.import_stars_title')}>
          <ImportStarsSection />
        </Section>

        <Section title={t('settings.export_vault_title')}>
          <ExportVaultSection />
        </Section>

        <Section title={t('settings.demo_title')}>
          <DemoDataSection />
        </Section>

        <Section title={`${t('settings.developer')}: ${t('settings.integrations')}`}>
          <IntegrationsList />
        </Section>

        {/* Enterprise */}
        {prefs.activeOrgId && (
          <>
            <Section title={`Enterprise: ${t('settings.saml_title')}`}>
              <p className="text-[10px] text-ink-soft mb-4 italic">
                {t('settings.saml_desc')}
              </p>
              <OrgSAMLManager orgId={prefs.activeOrgId} />
            </Section>

            <Section title={`Enterprise: ${t('settings.scim_title')}`}>
              <p className="text-[10px] text-ink-soft mb-4 italic">
                {t('settings.scim_desc')}
              </p>
              <OrgSCIMManager orgId={prefs.activeOrgId} />
            </Section>

            <Section title={`Enterprise: ${t('settings.insights_title')}`}>
              <OrgInsights orgId={prefs.activeOrgId} />
            </Section>
          </>
        )}

        {/* Connection */}
        <Section title={t('settings.connection')}>
          <Field label={t('settings.api_url')}>
            <code className="font-mono text-sm break-all">{apiUrl}</code>
          </Field>
          <Field label={t('settings.active_region')}>
             <div className="flex items-center gap-2">
                <Globe size={14} className="text-accent-cyan" />
                <span className="font-mono text-xs uppercase font-bold">{me?.region || 'us-east'}</span>
             </div>
          </Field>
          {cfg.authMode === 'jwt' ? (
            <Field label={t('settings.session')}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm">
                  {sessionActive ? t('settings.oauth_active') : t('settings.no_session')}
                </span>
                {sessionActive && (
                  <Button size="sm" variant="secondary" onClick={logout}>
                    {t('settings.logout_button')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-2 font-mono">
                {t('settings.session_desc')}
              </p>
            </Field>
          ) : (
            <Field label={t('settings.api_token')}>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-sm">
                  {tokenVisible ? apiToken || t('settings.not_configured') : maskedToken}
                </code>
                <button
                  type="button"
                  onClick={() => setTokenVisible((v) => !v)}
                  className="border-2 border-ink p-1 hover:bg-accent-yellow"
                  aria-label={tokenVisible ? t('common.close') : t('common.open')}
                >
                  {tokenVisible ? (
                    <EyeOff size={14} strokeWidth={3} />
                  ) : (
                    <Eye size={14} strokeWidth={3} />
                  )}
                </button>
                {apiToken && (
                  <Button size="sm" variant="secondary" onClick={copyToken}>
                    {t('common.copy_code')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-2 font-mono">
                {t('settings.env_configured')}
              </p>
            </Field>
          )}
        </Section>

        {/* About */}
        <Section title={t('settings.about')}>
          <div className="space-y-2">
            <p className="font-display font-black text-3xl uppercase">
              DevDeck
            </p>
            <p className="font-mono text-sm text-ink-soft">v{APP_VERSION}</p>
            <p className="text-sm mt-3">
              {t('settings.about_desc')}
            </p>
          </div>
        </Section>
      </main>
      </div>
    </AppShell>
  )
}

function DeviceList({ currentClientId }: { currentClientId: string }) {
  const { t } = useTranslation()
  const { data: devices = [], isLoading } = useDevices()
  const deleteDevice = useDeleteDevice()

  if (isLoading) return <div className="font-mono text-xs text-ink-soft">{t('settings.device_loading')}</div>

  async function handleDelete(clientId: string, name: string) {
    const ok = await confirm({
      title: t('settings.unlink_device'),
      message: t('settings.unlink_confirm', { name }),
      confirmLabel: t('settings.unlink_button'),
      variant: 'danger',
    })
    if (!ok) return

    try {
      await deleteDevice.mutateAsync(clientId)
      showToast(t('settings.unlink_success'))
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
                    {t('settings.this_device')}
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-ink-soft truncate">
                {t('settings.last_seen', { date: new Date(d.last_seen_at).toLocaleString() })}
              </p>
            </div>
            {!isCurrent && (
              <button
                onClick={() => handleDelete(d.client_id, d.name)}
                title={t('settings.unlink_button')}
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
  const { t } = useTranslation()
  const [status, setStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  async function request() {
    if (!('Notification' in window)) {
      showToast(t('settings.browser_no_support'), 'error')
      return
    }
    const res = await Notification.requestPermission()
    setStatus(res)
    if (res === 'granted') {
      showToast(t('settings.notifications_enabled_desc'))
      new Notification(t('settings.notifications_toast.title'), {
        body: t('settings.notifications_toast.body'),
        icon: '/favicon.svg'
      })
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-display font-bold text-base flex items-center gap-2">
           {t('settings.system_notifications')}
           {status === 'granted' && <Check size={16} className="text-accent-lime" strokeWidth={4} />}
        </p>
        <p className="text-xs text-ink-soft font-mono mt-1">
          {status === 'granted' 
            ? t('settings.notifications_enabled_desc') 
            : t('settings.notifications_disabled_desc')}
        </p>
      </div>
      
      {status !== 'granted' && (
        <Button size="sm" onClick={request} variant="secondary">
          {t('settings.enable_button')}
        </Button>
      )}
    </div>
  )
}

function APIKeyManager() {
  const { t } = useTranslation()
  const { data: keysRes, isLoading } = useAPIKeys()
  const createKey = useCreateAPIKey()
  const deleteKey = useDeleteAPIKey()
  const [newToken, setNewToken] = useState<string | null>(null)

  const keys = keysRes?.keys || []

  async function handleCreate() {
    const name = window.prompt(t('settings.key_name_prompt'))
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
           <p className="text-xs font-bold uppercase mb-2">{t('settings.new_key_title')}</p>
           <p className="text-[10px] mb-3 leading-tight">{t('settings.new_key_desc')}</p>
           <div className="flex items-center gap-2">
              <code className="bg-white border-2 border-ink px-3 py-2 text-sm font-mono flex-1 break-all select-all">
                {newToken}
              </code>
              <button 
                onClick={() => setNewToken(null)}
                className="font-mono text-[10px] uppercase font-black underline"
              >
                {t('common.close')}
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
                {t('settings.last_used', { date: k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : t('settings.never_used') })}
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
        {t('settings.generate_key')}
      </Button>
    </div>
  )
}

function CustomEnricherManager() {
  const { t } = useTranslation()
  const { data: encRes, isLoading } = useCustomEnrichers()
  const createEnc = useCreateCustomEnricher()
  const deleteEnc = useDeleteCustomEnricher()

  const enrichers = encRes?.enrichers || []

  async function handleCreate() {
    const name = window.prompt(t('settings.plugin_name_prompt'))
    const pattern = window.prompt(t('settings.plugin_pattern_prompt'))
    const endpoint = window.prompt(t('settings.plugin_webhook_prompt'))
    
    if (!name || !pattern || !endpoint) return
    
    try {
      await createEnc.mutateAsync({ name, url_pattern: pattern, endpoint_url: endpoint })
      showToast(t('settings.plugin_registered'))
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
        {t('settings.register_http_plugin')}
      </Button>
    </div>
  )
}

function OrgSAMLManager({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const { data: saml, isLoading } = useOrgSAML(orgId)
  const updateSAML = useUpdateOrgSAML()
  
  const [domain, setDomain] = useState(saml?.domain || '')
  const [ssoUrl, setSsoUrl] = useState(saml?.idp_sso_url || '')
  const [entityId, setEntityId] = useState(saml?.idp_entity_id || '')
  const [cert, setCert] = useState(saml?.idp_x509_cert || '')

  useEffect(() => {
    if (saml) {
      setDomain(saml.domain)
      setSsoUrl(saml.idp_sso_url)
      setEntityId(saml.idp_entity_id)
      setCert(saml.idp_x509_cert)
    }
  }, [saml])

  async function handleSave() {
    try {
      await updateSAML.mutateAsync({
        orgId,
        input: { domain, idp_sso_url: ssoUrl, idp_entity_id: entityId, idp_x509_cert: cert }
      })
      showToast(t('common.save'))
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  if (isLoading) return <div className="animate-pulse font-mono text-[10px]">{t('common.loading')}</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase mb-1">{t('settings.saml.domain_label')}</label>
          <input 
            value={domain} onChange={e => setDomain(e.target.value)}
            className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/5 outline-none"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase mb-1">{t('settings.saml.idp_sso_url')}</label>
          <input 
            value={ssoUrl} onChange={e => setSsoUrl(e.target.value)}
            className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/5 outline-none"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase mb-1">{t('settings.saml.idp_entity_id')}</label>
          <input 
            value={entityId} onChange={e => setEntityId(e.target.value)}
            className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/5 outline-none"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase mb-1">{t('settings.saml.cert_label')}</label>
          <textarea 
            value={cert} onChange={e => setCert(e.target.value)}
            rows={4}
            className="w-full border-2 border-ink p-2 font-mono text-[10px] focus:bg-accent-yellow/5 outline-none"
          />
        </div>
      </div>
      <Button onClick={handleSave} disabled={updateSAML.isPending} className="w-full" size="sm">
        {t('common.save')}
      </Button>
    </div>
  )
}

function OrgSCIMManager({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const generate = useGenerateSCIMToken()
  const [token, setToken] = useState<string | null>(null)
  
  const cfg = getConfig()
  const scimUrl = `${cfg.baseUrl || window.location.origin}/scim/v2`

  async function handleGenerate() {
    try {
      const res = await generate.mutateAsync(orgId)
      setToken(res.token)
      showToast(t('settings.scim_token_generated'))
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Field label="SCIM Base URL">
        <code className="bg-bg-primary border-2 border-ink px-3 py-2 text-[10px] font-mono block break-all">
          {scimUrl}
        </code>
      </Field>

      {token ? (
        <div className="bg-accent-yellow border-3 border-ink p-4 shadow-hard animate-in zoom-in duration-300">
           <p className="text-xs font-bold uppercase mb-2">{t('settings.scim_token_generated')}</p>
           <p className="text-[10px] mb-3 leading-tight text-ink/70">{t('settings.scim_token_desc')}</p>
           <div className="flex items-center gap-2">
              <code className="bg-white border-2 border-ink px-3 py-2 text-[10px] font-mono flex-1 break-all select-all">
                {token}
              </code>
              <button 
                onClick={() => setToken(null)}
                className="font-mono text-[10px] uppercase font-black underline"
              >
                {t('common.close')}
              </button>
           </div>
        </div>
      ) : (
        <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full" variant="secondary" size="sm">
          {generate.isPending ? t('common.loading') : t('settings.scim_title')}
        </Button>
      )}

      <div className="bg-bg-primary border-2 border-ink p-3">
         <p className="text-[9px] font-mono leading-tight text-ink-soft italic">
           {t('settings.scim_tip')}
         </p>
      </div>
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
