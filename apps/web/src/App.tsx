import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import type { ReactElement } from 'react'
import { useState } from 'react'
import {
  CheatsheetDetailPage,
  CheatsheetsListPage,
  GlobalSearchModal,
  DiscoveryPage,
  HomePage,
  ItemDetailPage,
  ItemsPage,
  RepoDetailPage,
  SettingsPage,
  TeamReviewPage,
  useGlobalShortcuts,
} from '@devdeck/features'
import { CaptureModal, ShortcutsModal } from '@devdeck/features'
import { ConfirmHost, PageTransition, Toaster } from '@devdeck/ui'
import { isLoggedIn } from '@devdeck/api-client'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
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
  const navigate = useNavigate()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Global keyboard shortcuts
  useGlobalShortcuts({
    onGlobalSearch: () => setGlobalSearchOpen(true),
    onCapture: () => setCaptureOpen(true),
    onShortcuts: () => setShortcutsOpen(true),
  })

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={<AuthGuard>{withTransition(<ItemsPage />)}</AuthGuard>}
        />
        <Route
          path="/repos"
          element={<AuthGuard>{withTransition(<HomePage />)}</AuthGuard>}
        />
        <Route
          path="/items"
          element={<AuthGuard>{withTransition(<ItemsPage />)}</AuthGuard>}
        />
        <Route
          path="/items/:id"
          element={<AuthGuard>{withTransition(<ItemDetailPage />)}</AuthGuard>}
        />
        <Route
          path="/review"
          element={<AuthGuard>{withTransition(<TeamReviewPage />)}</AuthGuard>}
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

      {/* Global modals */}
      <GlobalSearchModal open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <CaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onOpenItem={(id) => {
          setCaptureOpen(false)
          navigate(`/items/${id}`)
        }}
        source="manual"
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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
