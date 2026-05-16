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
  Zap 
} from 'lucide-react'
import { Button, TagChip, hashIndex } from '@devdeck/ui'
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
          <a href="#ai" className="hover:text-ink transition-colors">IA Honesta</a>
          <a href="#platforms" className="hover:text-ink transition-colors">Plataformas</a>
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
                Empezar gratis
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 px-6 overflow-hidden border-b-3 border-ink bg-bg-card">
        {/* Brutalist background elements */}
        <div className="absolute top-10 right-[-50px] w-64 h-64 border-3 border-ink rotate-12 opacity-5 pointer-events-none" />
        <div className="absolute bottom-[-20px] left-10 w-40 h-40 border-3 border-ink -rotate-6 bg-accent-pink/10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block bg-accent-lime border-2 border-ink px-3 py-1 mb-6 shadow-hard-sm">
            <span className="font-mono text-[10px] uppercase font-black">Wave 7 is here</span>
          </div>
          
          <h1 className="font-display font-black text-5xl md:text-7xl uppercase tracking-tighter leading-[0.9] mb-8">
            Tu memoria externa <br />
            <span className="text-accent-pink">para desarrollo.</span>
          </h1>
          
          <p className="font-medium text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl mx-auto text-ink-soft">
            Guardá repos, CLIs, plugins, atajos y comandos. <br className="hidden md:block" />
            Encontralos cuando los necesitás — incluso si olvidaste cómo se llamaban.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={handleStart} className="w-full sm:w-auto text-xl py-6 px-10 shadow-hard-lg">
              {authenticated ? 'Ir a mi vault' : 'Empezar ahora — Gratis'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/waitlist')} className="w-full sm:w-auto text-xl py-6 px-10">
              Unirse a la Waitlist
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 opacity-60">
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
              <Monitor size={20} /> <span className="font-mono text-[10px] uppercase font-bold">Native Desktop</span>
            </div>
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
              <Globe size={20} /> <span className="font-mono text-[10px] uppercase font-bold">PWA Web</span>
            </div>
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
              <Cloud size={20} /> <span className="font-mono text-[10px] uppercase font-bold">Offline-first</span>
            </div>
          </div>
        </div>
      </header>

      {/* Problem Statement */}
      <section className="py-20 px-6 bg-bg-primary border-b-3 border-ink">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <ProblemCard 
            title="¿Dónde estaba ese repo?"
            body="Alguien compartió un CLI útil en Slack hace 3 meses. Hoy lo necesitás. Desapareció."
          />
          <ProblemCard 
            title="Marcadores inútiles"
            body="Tus bookmarks tienen 800 items. Los abrís una vez al año para sentirte mal."
          />
          <ProblemCard 
            title="Sé que esto existe..."
            body="Viste la herramienta perfecta para este problema exacto. No recordás el nombre."
          />
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-6 bg-bg-card border-b-3 border-ink">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-black text-4xl uppercase mb-16 tracking-tight text-center md:text-left">
            Lo que DevDeck hace <span className="bg-accent-lavender px-3 border-3 border-ink">por vos</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Box size={24} strokeWidth={3} />}
              title="Guardá de todo"
              body="No solo links. Repos, comandos de terminal, prompts de IA, atajos de macOS y notas personales."
              color="bg-accent-yellow"
            />
            <FeatureCard 
              icon={<Zap size={24} strokeWidth={3} />}
              title="Organización IA"
              body="DevDeck taguea y resume automáticamente lo que guardás. Sin trabajo manual."
              color="bg-accent-pink"
            />
            <FeatureCard 
              icon={<Search size={24} strokeWidth={3} />}
              title="Búsqueda Semántica"
              body="Busca por significado. 'herramientas para agentes' encuentra lo que necesitás aunque no tenga esos tags."
              color="bg-accent-lime"
            />
            <FeatureCard 
              icon={<Cloud size={24} strokeWidth={3} />}
              title="Offline-first"
              body="Funciona sin internet. Se sincroniza entre Mac, Windows, Linux y browser automáticamente."
              color="bg-accent-cyan"
            />
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 px-6 bg-bg-elevated border-b-3 border-ink">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="font-display font-black text-5xl uppercase tracking-tighter">IA Honesta</h2>
            <p className="font-mono text-sm text-ink-soft uppercase font-bold tracking-widest">IA que trabaja para vos, no que te distrae.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-bg-card border-3 border-ink p-8 shadow-hard relative">
              <Sparkles size={20} className="absolute top-4 right-4 text-accent-pink" />
              <h3 className="font-display font-black text-xl uppercase mb-4 tracking-tight">Auto-tagging</h3>
              <p className="text-sm leading-relaxed mb-6">Cuando guardás algo, DevDeck detecta qué es, qué stack toca y para qué sirve. Te propone los tags; vos los confirmás.</p>
              <div className="flex flex-wrap gap-1.5">
                <TagChip label="CLI" variant="outline" />
                <TagChip label="Go" variant="outline" />
                <TagChip label="productivity" variant="outline" />
              </div>
            </div>

            <div className="bg-bg-card border-3 border-ink p-8 shadow-hard relative">
              <Brain size={20} className="absolute top-4 right-4 text-accent-lavender" />
              <h3 className="font-display font-black text-xl uppercase mb-4 tracking-tight">Auto-summary</h3>
              <p className="text-sm leading-relaxed mb-6">Cada item recibe un resumen de una frase: qué es y cuándo usarlo. El antídoto para el "por qué guardé esto".</p>
              <div className="bg-bg-primary border-2 border-ink border-dashed p-3 text-xs font-medium italic">
                "CLI interactivo en Go para manejar contenedores Docker de forma visual."
              </div>
            </div>
          </div>

          <div className="bg-ink text-white p-8 border-3 border-ink shadow-hard">
             <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <h3 className="font-display font-black text-2xl uppercase tracking-tight text-accent-yellow">Ask DevDeck</h3>
                  <p className="text-sm leading-relaxed opacity-80">
                    Chateá con tu propio vault. Hacé preguntas técnicas basadas únicamente en tus herramientas y notas guardadas. RAG puro, sin alucinaciones de internet.
                  </p>
                </div>
                <div className="w-full md:w-auto">
                   <div className="border-2 border-white/20 p-4 bg-white/5 font-mono text-[10px] space-y-2">
                      <p className="text-accent-cyan">? ¿Cómo levanto el backend de DevDeck?</p>
                      <p className="text-white/60">✦ Según tus notas: 'cd backend && make run'. Recordá tener Postgres iniciado en el puerto 5432.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-bg-card border-b-3 border-ink">
        <div className="max-w-4xl mx-auto">
           <div className="text-center mb-16">
              <h2 className="font-display font-black text-5xl uppercase tracking-tighter mb-4">Pricing</h2>
              <p className="font-mono text-sm text-ink-soft uppercase font-bold">Empezá gratis. Escalá si lo necesitás.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="bg-bg-card border-3 border-ink p-8 shadow-hard flex flex-col">
                <h3 className="font-display font-black text-3xl uppercase mb-2">Free</h3>
                <p className="font-display font-bold text-5xl mb-8">$0<span className="text-lg font-mono font-normal">/mes</span></p>
                
                <ul className="space-y-3 mb-10 flex-1">
                  <PricingItem label="Hasta 500 items" checked />
                  <PricingItem label="Sync en 2 dispositivos" checked />
                  <PricingItem label="Cheatsheets oficiales" checked />
                  <PricingItem label="Búsqueda fuzzy" checked />
                  <PricingItem label="IA básica (10 req/h)" checked />
                </ul>

                <Button variant="secondary" onClick={handleStart} className="w-full">
                  Empezar ahora
                </Button>
              </div>

              {/* Pro Plan */}
              <div className="bg-accent-yellow border-3 border-ink p-8 shadow-hard-lg flex flex-col relative scale-105">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-ink text-white px-3 py-1 font-mono text-[10px] uppercase font-black">
                  Recommended
                </div>
                <h3 className="font-display font-black text-3xl uppercase mb-2">Pro</h3>
                <p className="font-display font-black text-5xl mb-8">$10<span className="text-lg font-mono font-normal">/mes</span></p>
                
                <ul className="space-y-3 mb-10 flex-1 text-ink">
                  <PricingItem label="Items ilimitados" checked black />
                  <PricingItem label="Sync ilimitado" checked black />
                  <PricingItem label="IA avanzada (100 req/h)" checked black />
                  <PricingItem label="Búsqueda semántica" checked black />
                  <PricingItem label="Decks compartibles" checked black />
                  <PricingItem label="Acceso a la API" checked black />
                </ul>

                <Button variant="accent" onClick={() => navigate('/waitlist')} className="w-full border-ink bg-ink text-white hover:bg-ink/90">
                  Unirse a la lista PRO
                </Button>
              </div>
           </div>
           
           <p className="text-center mt-12 font-mono text-[10px] text-ink-soft uppercase font-bold italic">
             * Durante el beta privado, todas las features Pro son gratuitas.
           </p>
        </div>
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
              Creado por y para developers que están cansados de perder cosas útiles. 
              Tu memoria técnica, ahora con esteroides.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-black uppercase text-xs tracking-widest text-ink-soft">Product</h4>
            <ul className="font-mono text-[10px] uppercase font-bold space-y-2">
              <li><Link to="/download" className="hover:text-accent-pink transition-colors">Download</Link></li>
              <li><Link to="/login" className="hover:text-accent-pink transition-colors">Web App</Link></li>
              <li><a href="#" className="hover:text-accent-pink transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-accent-pink transition-colors">Roadmap</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-black uppercase text-xs tracking-widest text-ink-soft">Community</h4>
            <ul className="font-mono text-[10px] uppercase font-bold space-y-2">
              <li className="flex items-center gap-2">
                <Github size={12} /> <a href="https://github.com/tiagofur/dev_deck" target="_blank" rel="noreferrer" className="hover:text-accent-pink transition-colors">GitHub</a>
              </li>
              <li className="flex items-center gap-2">
                <Code2 size={12} /> <a href="#" className="hover:text-accent-pink transition-colors">Discord</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] text-ink-soft uppercase font-bold tracking-widest">
            © 2026 DevDeck · Made in Buenos Aires
          </p>
          <div className="flex gap-6 font-mono text-[9px] uppercase font-black opacity-40">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProblemCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-bg-card border-3 border-ink p-8 shadow-hard h-full">
      <h3 className="font-display font-black text-xl uppercase mb-4 tracking-tight leading-tight">"{title}"</h3>
      <p className="text-sm leading-relaxed text-ink-soft italic font-medium">{body}</p>
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

function Box({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return <Code2 size={size} strokeWidth={strokeWidth} />
}
