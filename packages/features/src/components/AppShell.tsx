import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from './Topbar'

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
  className = 'h-screen flex flex-col bg-bg-primary',
  contentClassName = 'flex-1 overflow-hidden',
}: AppShellProps) {
  const navigate = useNavigate()
  const [internalQuery, setInternalQuery] = useState('')
  const currentQuery = query ?? internalQuery
  const setQuery = onQueryChange ?? setInternalQuery

  return (
    <div className={className}>
      <Topbar
        query={currentQuery}
        onQueryChange={setQuery}
        onAdd={() => window.dispatchEvent(new CustomEvent('devdeck:open-capture'))}
        onDiscovery={() => navigate('/discovery')}
        onSettings={() => navigate('/settings')}
        onGlobalSearch={() => window.dispatchEvent(new CustomEvent('devdeck:open-search'))}
        reviewCount={reviewCount}
      />
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
