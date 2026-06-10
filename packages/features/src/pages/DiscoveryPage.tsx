import { Navigate } from 'react-router-dom'

/**
 * Discovery lives inside Explore now (#124). This shim keeps old
 * /discovery links and shortcuts working.
 */
export function DiscoveryPage() {
  return <Navigate to="/explore?tab=discovery" replace />
}
