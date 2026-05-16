import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactElement } from 'react'
import {
  CheatsheetDetailPage,
  CheatsheetsListPage,
  CaptureModal,
  DiscoveryPage,
  HomePage,
  ItemDetailPage,
  ItemsPage,
  RepoDetailPage,
  SettingsPage,
  AdminDashboardPage,
  PublicDeckPage,
  PublicProfilePage,
  ShortcutsModal,
  TeamReviewPage,
  TeamFeedPage,
  FollowingFeedPage,
  UnifiedCommandPalette,
  useGlobalShortcuts,
} from '@devdeck/features'
import { ConfirmHost, PageTransition, Toaster } from '@devdeck/ui'
import { isLoggedIn } from '@devdeck/api-client'
import { PasteInterceptor } from './components/PasteInterceptor'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AuthGuard({ children }: { children: ReactElement }): ReactElement {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function withTransition(element: ReactElement): ReactElement {
  return <PageTransition>{element}</PageTransition>
}

function desktopCallbackPath(rawURL: string): string {
  try {
    const parsed = new URL(rawURL)
    return `/auth/callback${parsed.search}`
  } catch {
    return '/login'
  }
}

function AuthBridge(): null {
  const navigate = useNavigate()

  useEffect(() => {
    const pending = (window as any).electronAPI?.auth.getPendingCallbackURL()
    if (pending) {
      navigate(desktopCallbackPath(pending), { replace: true })
    }
    return (window as any).electronAPI?.auth.onCallbackURL((url: string) => {
      navigate(desktopCallbackPath(url), { replace: true })
    })
  }, [navigate])

  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useGlobalShortcuts({
    onGlobalSearch: () => setGlobalSearchOpen(true),
    onCapture: () => setCaptureOpen(true),
    onShortcuts: () => setShortcutsOpen(true),
  })

  useEffect(() => {
    const onOpenCapture = () => setCaptureOpen(true)
    window.addEventListener('devdeck:open-capture', onOpenCapture)
    return () => window.removeEventListener('devdeck:open-capture', onOpenCapture)
  }, [])

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>{withTransition(<ItemsPage />)}</AuthGuard>
            }
          />
          <Route
            path="/repos"
            element={
              <AuthGuard>{withTransition(<HomePage />)}</AuthGuard>
            }
          />
          <Route
            path="/items"
            element={
              <AuthGuard>{withTransition(<ItemsPage />)}</AuthGuard>
            }
          />
          <Route
            path="/items/:id"
            element={
              <AuthGuard>{withTransition(<ItemDetailPage />)}</AuthGuard>
            }
          />
          <Route
            path="/review"
            element={
              <AuthGuard>{withTransition(<TeamReviewPage />)}</AuthGuard>
            }
          />
          <Route
            path="/feed"
            element={
              <AuthGuard>{withTransition(<TeamFeedPage />)}</AuthGuard>
            }
          />
          <Route
            path="/following"
            element={
              <AuthGuard>{withTransition(<FollowingFeedPage />)}</AuthGuard>
            }
          />
          <Route
            path="/repo/:id"
            element={
              <AuthGuard>{withTransition(<RepoDetailPage />)}</AuthGuard>
            }
          />
          <Route
            path="/discovery"
            element={
              <AuthGuard>{withTransition(<DiscoveryPage />)}</AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>{withTransition(<SettingsPage />)}</AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthGuard>{withTransition(<AdminDashboardPage />)}</AuthGuard>
            }
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
          <Route path="/deck/:slug" element={withTransition(<PublicDeckPage />)} />
          <Route path="/u/:username" element={withTransition(<PublicProfilePage />)} />
        </Routes>
      </AnimatePresence>
      <UnifiedCommandPalette open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <CaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onOpenItem={(id) => navigate(`/items/${id}`)}
        source="manual"
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <PasteInterceptor onOpenItem={(id) => navigate(`/items/${id}`)} />
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthBridge />
        <AnimatedRoutes />
      </HashRouter>
      <Toaster />
      <ConfirmHost />
    </QueryClientProvider>
  )
}
