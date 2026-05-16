import { useState } from 'react'
import { Settings, ShieldCheck, LogOut, ExternalLink } from 'lucide-react'
import { isLoggedIn, logoutCurrentSession, loginLocal } from '@devdeck/api-client'
import { Button, showToast, Toaster } from '@devdeck/ui'

export function Options() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await loginLocal(email, password)
      setLoggedIn(true)
      showToast('Sesión iniciada correctamente', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar sesión', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logoutCurrentSession()
    setLoggedIn(false)
    showToast('Sesión cerrada')
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto space-y-12">
      <header className="border-b-5 border-ink pb-6">
        <h1 className="font-display font-black text-5xl uppercase tracking-tighter flex items-center gap-4">
          <Settings size={40} strokeWidth={3} />
          Configuración
        </h1>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-bg-card border-3 border-ink shadow-hard p-6 space-y-6">
          <h2 className="font-display font-black uppercase text-xl tracking-widest flex items-center gap-2">
            <ShieldCheck size={24} strokeWidth={3} className="text-accent-lime" />
            Autenticación
          </h2>

          {loggedIn ? (
            <div className="space-y-4">
              <p className="font-mono text-sm text-ink-soft">Tenés una sesión activa en este navegador.</p>
              <Button onClick={handleLogout} variant="secondary" className="w-full">
                <span className="flex items-center gap-2">
                  <LogOut size={16} /> Cerrar Sesión
                </span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block font-display font-bold uppercase text-[10px]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/5 outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block font-display font-bold uppercase text-[10px]">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-ink p-2 font-mono text-xs focus:bg-accent-yellow/5 outline-none"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              </Button>
            </form>
          )}
        </section>

        <section className="bg-bg-card border-3 border-ink shadow-hard p-6 space-y-6">
          <h2 className="font-display font-black uppercase text-xl tracking-widest">Atajos</h2>
          <div className="space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-ink/10 pb-2">
              <span className="text-ink-soft">Capturar Tab</span>
              <kbd className="bg-ink text-white px-2 py-1 rounded">Alt+Shift+D</kbd>
            </div>
            <p className="text-[10px] text-ink-soft leading-relaxed italic">
              Podés cambiar los atajos en la configuración de extensiones de tu navegador.
            </p>
          </div>
          
          <div className="pt-4">
             <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => window.open('https://devdeck.ai', '_blank')}
             >
                <span className="flex items-center gap-2">
                  Ir a la Web <ExternalLink size={14} />
                </span>
             </Button>
          </div>
        </section>
      </main>

      <footer className="text-center pt-12 border-t-2 border-ink/10">
        <p className="font-mono text-[10px] text-ink-soft uppercase tracking-widest">
          DevDeck Extension v2.0.0
        </p>
      </footer>
      
      <Toaster />
    </div>
  )
}
