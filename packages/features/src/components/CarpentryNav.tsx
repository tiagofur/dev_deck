import { NavLink } from 'react-router-dom'
import { Boxes, ClipboardList, FileText, Home, Users } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/projects', label: 'Proyectos', icon: ClipboardList },
  { to: '/catalog', label: 'Catalogo', icon: Boxes },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/quotes', label: 'Cotizaciones', icon: FileText },
]

export function CarpentryNav() {
  return (
    <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
      <div>
        <p className="font-display font-black text-2xl uppercase">Taller</p>
        <p className="font-mono text-xs text-ink-soft">Cotizador carpinteria</p>
      </div>
      <nav className="flex flex-wrap gap-2 ml-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard-sm flex items-center gap-1.5 ${
                isActive ? 'bg-accent-lime' : 'bg-bg-card hover:bg-accent-yellow/40'
              }`
            }
          >
            <Icon size={15} strokeWidth={3} />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
