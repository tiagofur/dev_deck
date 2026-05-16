import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Ticket, 
  ShieldCheck, 
  Plus, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import { 
  useAdminUsers, 
  useAdminWaitlist, 
  useAdminInvites, 
  useCreateInvite 
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'

type Tab = 'users' | 'waitlist' | 'invites'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/settings')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <ShieldCheck size={24} strokeWidth={3} className="text-accent-pink" />
          Admin Dashboard
        </h1>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Nav */}
          <aside className="w-full md:w-64 space-y-2">
            <NavButton 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')} 
              icon={<Users size={18} />} 
              label="Usuarios" 
            />
            <NavButton 
              active={activeTab === 'waitlist'} 
              onClick={() => setActiveTab('waitlist')} 
              icon={<Mail size={18} />} 
              label="Waitlist" 
            />
            <NavButton 
              active={activeTab === 'invites'} 
              onClick={() => setActiveTab('invites')} 
              icon={<Ticket size={18} />} 
              label="Invitaciones" 
            />
          </aside>

          {/* Content */}
          <section className="flex-1 min-w-0">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'waitlist' && <WaitlistTab />}
            {activeTab === 'invites' && <InvitesTab />}
          </section>
        </div>
      </main>
    </div>
  )
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 font-display font-black uppercase text-sm tracking-widest border-3 border-ink transition-all
        ${active ? 'bg-accent-yellow shadow-hard translate-x-[-2px] translate-y-[-2px]' : 'bg-bg-card hover:bg-bg-elevated shadow-none'}
      `}
    >
      {icon}
      {label}
    </button>
  )
}

function UsersTab() {
  const { data, isLoading } = useAdminUsers()
  const users = data?.users || []

  if (isLoading) return <LoadingState />

  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-bg-elevated border-b-3 border-ink">
          <tr>
            <th className="p-4 font-mono text-[10px] uppercase font-black">Login / ID</th>
            <th className="p-4 font-mono text-[10px] uppercase font-black text-center">Plan</th>
            <th className="p-4 font-mono text-[10px] uppercase font-black text-center">Items</th>
            <th className="p-4 font-mono text-[10px] uppercase font-black text-right">Creado</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-ink/10">
          {users.map((u: any) => (
            <tr key={u.id} className="hover:bg-accent-yellow/5">
              <td className="p-4">
                <div className="font-bold text-xs uppercase">{u.login}</div>
                <div className="font-mono text-[9px] text-ink-soft">{u.id}</div>
              </td>
              <td className="p-4 text-center">
                <span className={`px-2 py-0.5 border-2 border-ink font-mono text-[9px] uppercase font-bold ${u.plan === 'pro' ? 'bg-accent-lavender' : 'bg-bg-primary'}`}>
                  {u.plan}
                </span>
              </td>
              <td className="p-4 text-center font-mono text-xs font-bold">{u.item_count}</td>
              <td className="p-4 text-right font-mono text-[10px] text-ink-soft">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WaitlistTab() {
  const { data, isLoading, refetch } = useAdminWaitlist()
  const createInvite = useCreateInvite()
  const entries = data?.entries || []

  async function handleInvite(email: string) {
    try {
      await createInvite.mutateAsync({ email })
      showToast(`Invitación generada para ${email}`, 'success')
      refetch()
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-bg-elevated border-b-3 border-ink">
          <tr>
            <th className="p-4 font-mono text-[10px] uppercase font-black">Email</th>
            <th className="p-4 font-mono text-[10px] uppercase font-black text-center">Estado</th>
            <th className="p-4 font-mono text-[10px] uppercase font-black text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-ink/10">
          {entries.map((e: any) => (
            <tr key={e.id} className="hover:bg-accent-yellow/5">
              <td className="p-4 font-bold text-xs">{e.email}</td>
              <td className="p-4 text-center">
                <span className={`px-2 py-0.5 border-2 border-ink font-mono text-[9px] uppercase font-bold ${e.status === 'invited' ? 'bg-accent-lime' : 'bg-accent-yellow'}`}>
                  {e.status}
                </span>
              </td>
              <td className="p-4 text-right">
                {e.status === 'pending' && (
                  <Button size="sm" onClick={() => handleInvite(e.email)} disabled={createInvite.isPending}>
                    Generar Invite
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvitesTab() {
  const { data, isLoading } = useAdminInvites()
  const createInvite = useCreateInvite()
  const invites = data?.invites || []

  async function handleNewCode() {
    const code = window.prompt('Código personalizado (opcional)') || undefined
    await createInvite.mutateAsync({ code })
    showToast('Código generado')
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleNewCode} disabled={createInvite.isPending}>
          <Plus size={16} strokeWidth={3} className="mr-1" /> Nuevo Código
        </Button>
      </div>

      <div className="bg-bg-card border-3 border-ink shadow-hard overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-bg-elevated border-b-3 border-ink">
            <tr>
              <th className="p-4 font-mono text-[10px] uppercase font-black">Código</th>
              <th className="p-4 font-mono text-[10px] uppercase font-black text-center">Estado</th>
              <th className="p-4 font-mono text-[10px] uppercase font-black text-right">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ink/10">
            {invites.map((i: any) => (
              <tr key={i.id} className="hover:bg-accent-yellow/5">
                <td className="p-4 font-mono text-sm font-black tracking-tighter">{i.code}</td>
                <td className="p-4 text-center">
                  {i.used_by_id ? (
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1 text-[9px] font-mono text-accent-pink uppercase font-bold">
                         <CheckCircle2 size={10} /> Usado
                      </span>
                      <span className="text-[8px] font-mono text-ink-soft">{i.used_by_id}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono text-ink-soft uppercase font-bold flex items-center justify-center gap-1">
                      <XCircle size={10} /> Libre
                    </span>
                  )}
                </td>
                <td className="p-4 text-right font-mono text-[10px] text-ink-soft">
                  {new Date(i.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 size={32} className="animate-spin text-accent-pink" />
      <p className="font-mono text-sm text-ink-soft">Cargando datos del servidor…</p>
    </div>
  )
}
