import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import type { ReactElement } from 'react'
import {
  CheatsheetDetailPage,
  CheatsheetsListPage,
  DiscoveryPage,
  HomePage,
  ItemsPage,
  RepoDetailPage,
  SettingsPage,
} from '@devdeck/features'
import { ConfirmHost, PageTransition, Toaster } from '@devdeck/ui'
import { isLoggedIn } from '@devdeck/api-client'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Guard for protected routes. If no token is stored, bounce to /login.
function AuthGuard({ children }: { children: ReactElement }): ReactElement {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function withTransition(element: ReactElement): ReactElement {
  return <PageTransition>{element}</PageTransition>
}

function AnimatedRoutes(): ReactElement {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={<AuthGuard>{withTransition(<HomePage />)}</AuthGuard>}
        />
        <Route
          path="/items"
          element={<AuthGuard>{withTransition(<ItemsPage />)}</AuthGuard>}
        />
        <Route
          path="/repo/:id"
          element={<AuthGuard>{withTransition(<RepoDetailPage />)}</AuthGuard>}
        />
        <Route
          path="/discovery"
          element={<AuthGuard>{withTransition(<DiscoveryPage />)}</AuthGuard>}
        />
        <Route
          path="/settings"
          element={<AuthGuard>{withTransition(<SettingsPage />)}</AuthGuard>}
        />
        <Route
          path="/cheatsheets"
          element={
            <AuthGuard>{withTransition(<CheatsheetsListPage />)}</AuthGuard>
          }
        />
        <Route
          path="/cheatsheets/:id"
          element={
            <AuthGuard>{withTransition(<CheatsheetDetailPage />)}</AuthGuard>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  )
}

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
      <Toaster />
      <ConfirmHost />
    </QueryClientProvider>
  )
}
