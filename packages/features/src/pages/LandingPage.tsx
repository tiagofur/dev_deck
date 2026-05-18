import { useNavigate, Link } from 'react-router-dom'
import { 
  ArrowRight, 
  Brain, 
  CheckCircle2, 
  Cloud, 
  Code2, 
  Download, 
  Github, 
  Globe, 
  Library, 
  Monitor, 
  Search, 
  Sparkles, 
  Zap,
  Terminal,
  Shield,
  MessageSquare,
  Users,
  Bot
} from 'lucide-react'
import { Button, TagChip } from '@devdeck/ui'
import { isLoggedIn } from '@devdeck/api-client'

export function LandingPage() {
  const navigate = useNavigate()
  const authenticated = isLoggedIn()

  const handleStart = () => {
    if (authenticated) {
      navigate('/items')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary selection:bg-accent-yellow selection:text-ink">
      {/* Navigation */}
      <nav className="border-b-3 border-ink bg-bg-card sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={24} className="text-accent-yellow fill-accent-yellow" />
          <span className="font-display font-black text-2xl uppercase tracking-tighter">DevDeck.ai</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase font-bold text-ink-soft">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#ai" className="hover:text-ink transition-colors">IA Agentes</a>
          <a href="#teams" className="hover:text-ink transition-colors">Equipos</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Precios</a>
        </div>
        <div className="flex items-center gap-3">
          {authenticated ? (
            <Button size="sm" onClick={() => navigate('/items')}>
              Ir al Vault <ArrowRight size={14} strokeWidth={3} className="ml-1" />
            </Button>
          ) : (
            <>
              <Link to="/login" className="text-xs font-mono uppercase font-bold hover:underline hidden sm:block">Login</Link>
              <Button size="sm" variant="accent" onClick={() => navigate('/register')}>
                Probar v1.0
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-24 px-6 overflow-hidden border-b-3 border-ink bg-bg-card">
        {/* Brutalist background elements */}
        <div className="absolute top-10 right-[-50px] w-64 h-64 border-3 border-ink rotate-12 opacity-5 pointer-events-none" />
        <div className="absolute bottom-[-20px] left-10 w-40 h-40 border-3 border-ink -rotate-6 bg-accent-pink/10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block bg-accent-lime border-2 border-ink px-3 py-1 mb-6 shadow-hard-sm animate-bounce">
            <span className="font-mono text-[10px] uppercase font-black tracking-widest">v1.0 is officially LIVE</span>
          </div>
          
          <h1 className="font-display font-black text-5xl md:text-8xl uppercase tracking-tighter leading-[0.85] mb-8">
            The Knowledge OS <br />
            <span className="text-accent-pink">for Developers.</span>
          </h1>
          
          <p className="font-medium text-xl md:text-2xl leading-relaxed mb-10 max-w-3xl mx-auto text-ink-soft">
            Tu memoria externa asistida por agentes de IA. <br className="hidden md:block" />
            Guardá, organizá y **ejecutá** conocimiento útil. Para vos y para tu equipo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={handleStart} className="w-full sm:w-auto text-xl py-6 px-12 shadow-hard-lg">
              {authenticated ? 'Ir a mi vault' : 'Lanzar mi Vault Personal'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/download')} className="w-full sm:w-auto text-xl py-6 px-10">
              <Download size={20} className="mr-2" strokeWidth={3} /> Bajar Desktop
            </Button>
          </div>

          <div className="mt-16 bg-ink text-white p-6 border-4 border-ink shadow-hard max-w-2xl mx-auto text-left font-mono text-xs space-y-2 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-2 bg-accent-orange text-ink font-black text-[8px] uppercase tracking-widest">
               Agent Live Preview
             </div>
             <p className="text-accent-cyan">$ devdeck agent --task "setup new go backend"</p>
             <p className="text-white/60">✦ Analizando tu vault... Encontré 3 templates.</p>
             <p className="text-white/60">✦ Generando Runbook interactivo...</p>
             <p className="text-accent-lime">✦ ¿Deseas ejecutar 'make init' localmente? [Y/n]</p>
             <div className="w-1 h-4 bg-accent-pink animate-pulse inline-block" />
          </div>
        </div>
      </header>

      {/* Trust Bar */}
      <section className="py-8 border-b-3 border-ink bg-bg-elevated overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-12 animate-marquee">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex items-center gap-2 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default font-display font-black text-sm uppercase tracking-widest">
              <Code2 size={16} /> Autonomous Agents
              <Cloud size={16} className="ml-8" /> Offline-First
              <Shield size={16} className="ml-8" /> Enterprise SAML
              <Zap size={16} className="ml-8" /> Real-time Sync
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-6 bg-bg-card border-b-3 border-ink">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-black text-4xl uppercase mb-16 tracking-tight">
            Memoria <span className="bg-accent-lavender px-3 border-3 border-ink">Activa</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Brain size={24} strokeWidth={3} />}
              title="Cerebro Central"
              body="Guardá repos, CLIs, prompts y notas. La IA los organiza y taguea por vos automáticamente."
              color="bg-accent-yellow"
            />
            <FeatureCard 
              icon={<MessageSquare size={24} strokeWidth={3} />}
              title="Chat con tu Vault"
              body="RAG nativo. Preguntale a tu conocimiento guardado sin que nada salga de tu control."
              color="bg-accent-pink"
            />
            <FeatureCard 
              icon={<Terminal size={24} strokeWidth={3} />}
              title="Ejecución Híbrida"
              body="Los agentes proponen comandos; vos los aprobás. Ejecución local segura desde el Desktop."
              color="bg-accent-lime"
            />
            <FeatureCard 
              icon={<Cloud size={24} strokeWidth={3} />}
              title="Sync Global"
              body="Offline-first con sincronización multi-región. Tus datos siempre con vos, incluso sin red."
              color="bg-accent-cyan"
            />
          </div>
        </div>
      </section>

      {/* AI Agents & Automation */}
      <section id="ai" className="py-24 px-6 bg-bg-primary border-b-3 border-ink">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
           <div className="space-y-8">
              <h2 className="font-display font-black text-5xl uppercase tracking-tighter leading-[0.9]">
                Agentes que <br />
                <span className="text-accent-orange italic underline">hacen el trabajo.</span>
              </h2>
              <p className="text-xl leading-relaxed text-ink-soft">
                Basta de copiar y pegar comandos. Los agentes de DevDeck entienden tus **Runbooks** y pueden ejecutar pasos en tu terminal local bajo tu supervisión.
              </p>
              
              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                    <div className="mt-1 bg-accent-lime border-2 border-ink p-0.5"><CheckCircle2 size={14} strokeWidth={3} /></div>
                    <div>
                       <p className="font-display font-black uppercase text-xs">Auto-Runbooks</p>
                       <p className="text-sm opacity-70">Generación automática de guías de setup basadas en READMEs.</p>
                    </div>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="mt-1 bg-accent-lime border-2 border-ink p-0.5"><CheckCircle2 size={14} strokeWidth={3} /></div>
                    <div>
                       <p className="font-display font-black uppercase text-xs">Tool Calling Nativo</p>
                       <p className="text-sm opacity-70">La IA interactúa con tu vault para buscar y crear recursos.</p>
                    </div>
                 </li>
              </ul>

              <Button size="lg" onClick={() => navigate('/register')}>Probar el Agente v1.0</Button>
           </div>
           
           <div className="relative">
              <div className="bg-bg-card border-4 border-ink shadow-hard p-2 rotate-2">
                 <div className="bg-ink p-6 font-mono text-sm space-y-4">
                    <div className="flex gap-2">
                       <Bot size={16} className="text-accent-yellow" />
                       <span className="text-white">¿Querés que instale las dependencias de 'DevDeck'?</span>
                    </div>
                    <div className="ml-6 bg-white/10 p-3 border-l-4 border-accent-pink">
                       <code className="text-accent-pink">pnpm install --frozen-lockfile</code>
                    </div>
                    <div className="flex gap-3 ml-6">
                       <button className="bg-accent-lime border-2 border-ink px-3 py-1 text-[10px] font-black uppercase text-ink">Aprobar y Correr</button>
                       <button className="border-2 border-white/20 px-3 py-1 text-[10px] font-black uppercase text-white/40">Ignorar</button>
                    </div>
                 </div>
              </div>
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-accent-yellow/20 border-3 border-ink border-dashed -z-10 rounded-full animate-pulse" />
           </div>
        </div>
      </section>

      {/* Team Intelligence */}
      <section id="teams" className="py-24 px-6 bg-bg-elevated border-b-3 border-ink overflow-hidden">
        <div className="max-w-6xl mx-auto text-center space-y-16 relative">
          <div className="space-y-4">
            <h2 className="font-display font-black text-6xl uppercase tracking-tighter">Inteligencia Colectiva.</h2>
            <p className="text-2xl font-mono text-ink-soft max-w-3xl mx-auto">
              DevDeck para Equipos transforma el conocimiento individual en un activo organizacional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-bg-card border-3 border-ink p-8 shadow-hard text-left space-y-4">
                <Users size={32} className="text-accent-lavender" />
                <h4 className="font-display font-black uppercase text-lg">Team Vault</h4>
                <p className="text-sm opacity-70 leading-relaxed">Búsqueda unificada en todo lo que tu equipo ha validado. No más silos de conocimiento.</p>
             </div>
             <div className="bg-bg-card border-3 border-ink p-8 shadow-hard text-left space-y-4">
                <Zap size={32} className="text-accent-lime" />
                <h4 className="font-display font-black uppercase text-lg">Hot Topics</h4>
                <p className="text-sm opacity-70 leading-relaxed">Descubrí qué tecnologías está adoptando tu equipo en tiempo real mediante mapas de calor.</p>
             </div>
             <div className="bg-bg-card border-3 border-ink p-8 shadow-hard text-left space-y-4">
                <Shield size={32} className="text-accent-pink" />
                <h4 className="font-display font-black uppercase text-lg">Enterprise Ready</h4>
                <p className="text-sm opacity-70 leading-relaxed">SAML SSO, SCIM 2.0 y RBAC granular para que el compliance sea un trámite.</p>
             </div>
          </div>
          
          <div className="pt-8">
             <Button variant="secondary" size="lg" className="px-12 border-4">Contactar Ventas (Teams)</Button>
          </div>

          <Sparkles size={120} className="absolute -right-20 top-0 text-accent-yellow opacity-10 rotate-12" />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-bg-card border-b-3 border-ink">
        <div className="max-w-5xl mx-auto">
           <div className="text-center mb-16 space-y-2">
              <h2 className="font-display font-black text-5xl uppercase tracking-tighter">Pricing</h2>
              <p className="font-mono text-sm text-ink-soft uppercase font-bold tracking-widest">Ownership de tus datos. Sin sorpresas.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <div className="bg-bg-card border-3 border-ink p-8 shadow-hard flex flex-col">
                <h3 className="font-display font-black text-2xl uppercase mb-2">Personal</h3>
                <p className="font-display font-bold text-5xl mb-8">$0<span className="text-lg font-mono font-normal">/siempre</span></p>
                
                <ul className="space-y-3 mb-10 flex-1">
                  <PricingItem label="Hasta 1.000 items" checked />
                  <PricingItem label="Sync Offline-first" checked />
                  <PricingItem label="IA local (Ollama)" checked />
                  <PricingItem label="100% Open Source" checked />
                </ul>

                <Button variant="secondary" onClick={handleStart} className="w-full">
                  Empezar gratis
                </Button>
              </div>

              {/* Pro Plan */}
              <div className="bg-accent-yellow border-4 border-ink p-8 shadow-hard-lg flex flex-col relative md:-translate-y-4">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-ink text-white px-3 py-1 font-mono text-[10px] uppercase font-black">
                  Recommended
                </div>
                <h3 className="font-display font-black text-2xl uppercase mb-2">Cloud Pro</h3>
                <p className="font-display font-black text-5xl mb-8">$8<span className="text-lg font-mono font-normal">/mes</span></p>
                
                <ul className="space-y-3 mb-10 flex-1 text-ink">
                  <PricingItem label="Items ilimitados" checked black />
                  <PricingItem label="Sync Multi-región" checked black />
                  <PricingItem label="IA Cloud (OpenAI/Claude)" checked black />
                  <PricingItem label="Búsqueda Semántica" checked black />
                  <PricingItem label="Auto-Resúmenes ricos" checked black />
                </ul>

                <Button variant="accent" onClick={() => navigate('/register')} className="w-full border-ink bg-ink text-white hover:bg-ink/90">
                  Lanzar v1.0 Pro
                </Button>
              </div>

              {/* Team Plan */}
              <div className="bg-bg-card border-3 border-ink p-8 shadow-hard flex flex-col">
                <h3 className="font-display font-black text-2xl uppercase mb-2">Team</h3>
                <p className="font-display font-bold text-5xl mb-8">$15<span className="text-lg font-mono font-normal">/user</span></p>
                
                <ul className="space-y-3 mb-10 flex-1">
                  <PricingItem label="Collective Discovery" checked />
                  <PricingItem label="SAML & SCIM SSO" checked />
                  <PricingItem label="RBAC Avanzado" checked />
                  <PricingItem label="Analíticas de Equipo" checked />
                  <PricingItem label="Soporte prioritario" checked />
                </ul>

                <Button variant="secondary" onClick={() => navigate('/waitlist')} className="w-full">
                  Hablar con nosotros
                </Button>
              </div>
           </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-accent-pink border-b-3 border-ink text-ink text-center overflow-hidden relative">
          <div className="relative z-10 max-w-4xl mx-auto space-y-10">
             <h2 className="font-display font-black text-5xl md:text-7xl uppercase tracking-tighter leading-[0.85]">
                Dejá de buscar. <br /> Empezá a encontrar.
             </h2>
             <Button onClick={handleStart} className="text-2xl py-8 px-16 border-4 shadow-hard-lg hover:shadow-hard-xl transition-all">
                Crear mi Vault v1.0 Ahora
             </Button>
          </div>
          <Code2 size={200} className="absolute -bottom-20 -left-20 text-white/20 rotate-12" />
          <Terminal size={150} className="absolute -top-10 -right-10 text-white/20 -rotate-12" />
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-bg-card">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-t-3 border-ink pt-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles size={24} className="text-accent-yellow fill-accent-yellow" />
              <span className="font-display font-black text-2xl uppercase tracking-tighter">DevDeck.ai</span>
            </div>
            <p className="text-sm font-medium leading-relaxed max-w-sm">
              DevDeck is the Knowledge Operating System for the modern developer. 
              Made with 🖤 by devs, for devs.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-black uppercase text-xs tracking-widest text-ink-soft">Product</h4>
            <ul className="font-mono text-[10px] uppercase font-bold space-y-2">
              <li><Link to="/download" className="hover:text-accent-pink transition-colors">Download</Link></li>
              <li><Link to="/login" className="hover:text-accent-pink transition-colors">Web App</Link></li>
              <li><a href="#" className="hover:text-accent-pink transition-colors">Changelog</a></li>
              <li><a href="https://github.com/tiagofur/dev_deck/blob/main/ROADMAP.md" className="hover:text-accent-pink transition-colors">Roadmap</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-black uppercase text-xs tracking-widest text-ink-soft">Community</h4>
            <ul className="font-mono text-[10px] uppercase font-bold space-y-2">
              <li className="flex items-center gap-2">
                <Github size={12} /> <a href="https://github.com/tiagofur/dev_deck" target="_blank" rel="noreferrer" className="hover:text-accent-pink transition-colors">GitHub</a>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare size={12} /> <a href="#" className="hover:text-accent-pink transition-colors">Discord</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] text-ink-soft uppercase font-bold tracking-widest">
            © 2026 DevDeck · Made in Buenos Aires
          </p>
          <div className="flex gap-6 font-mono text-[9px] uppercase font-black opacity-40">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, body, color }: { icon: React.ReactNode; title: string; body: string; color: string }) {
  return (
    <div className="flex flex-col bg-bg-card border-3 border-ink shadow-hard-sm hover:shadow-hard transition-all group">
      <div className={`p-4 border-b-3 border-ink ${color} transition-colors group-hover:bg-opacity-80`}>
        {icon}
      </div>
      <div className="p-5 flex-1 space-y-3">
        <h4 className="font-display font-black uppercase text-sm tracking-widest">{title}</h4>
        <p className="text-xs leading-relaxed text-ink-soft">{body}</p>
      </div>
    </div>
  )
}

function PricingItem({ label, checked, black }: { label: string; checked: boolean; black?: boolean }) {
  return (
    <li className={`flex items-center gap-3 text-sm font-bold uppercase tracking-tight ${black ? 'text-ink' : 'text-ink-soft'}`}>
       <div className={`w-4 h-4 border-2 border-ink flex items-center justify-center ${checked ? (black ? 'bg-ink' : 'bg-accent-lime') : ''}`}>
         {checked && <CheckCircle2 size={12} className={black ? 'text-white' : 'text-ink'} strokeWidth={4} />}
       </div>
       {label}
    </li>
  )
}
