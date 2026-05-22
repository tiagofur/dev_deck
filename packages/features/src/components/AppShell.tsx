import type { ReactNode } from 'react'
import { useState } from 'react'
import { Topbar } from './Topbar'
import { NavSidebar } from './NavSidebar'

interface AppShellProps {
  children: ReactNode
  query?: string
  onQueryChange?: (query: string) => void
  reviewCount?: number
  className?: string
  contentClassName?: string
}

export function AppShell({
  children,
  query,
  onQueryChange,
  reviewCount,
  className = 'h-screen w-screen flex flex-row bg-bg-primary overflow-hidden',
  contentClassName = 'flex-1 overflow-y-auto',
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [internalQuery, setInternalQuery] = useState('')
  
  const currentQuery = query ?? internalQuery
  const setQuery = onQueryChange ?? setInternalQuery

  return (
    <div className={className}>
      {/* Persistent Left Sidebar (Desktop) / Sliding Overlay Drawer (Mobile) */}
      <NavSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        reviewCount={reviewCount}
      />

      {/* Main Content Pane (Topbar + Dynamic Viewport) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          query={currentQuery}
          onQueryChange={setQuery}
          onAdd={() => window.dispatchEvent(new CustomEvent('devdeck:open-capture'))}
          onGlobalSearch={() => window.dispatchEvent(new CustomEvent('devdeck:open-search'))}
          onMenuToggle={() => setSidebarOpen(true)}
          reviewCount={reviewCount}
        />
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  )
}
