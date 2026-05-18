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
import { useState, useEffect } from 'react'
import {
  CheatsheetDetailPage,
  CheatsheetsListPage,
  DiscoveryPage,
  HomePage,
  ItemDetailPage,
  CaptureSharePage,
  ItemsPage,
  LandingPage,
  RepoDetailPage,
  SettingsPage,
  OnboardingPage,
  AdminDashboardPage,
  WaitlistPage,
  PublicDeckPage,
  PublicProfilePage,
  TeamReviewPage,
  TeamFeedPage,
  FollowingFeedPage,
  UnifiedCommandPalette,
  useGlobalShortcuts,
} from '@devdeck/features'
import { CaptureModal, ShortcutsModal } from '@devdeck/features'
import { ConfirmHost, PageTransition, Toaster } from '@devdeck/ui'
import { isLoggedIn, useMe } from '@devdeck/api-client'
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
  const { data: user, isLoading } = useMe()
  const location = useLocation()

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) return <div className="h-screen bg-bg-primary" />

  if (user && !user.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
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
  const [initialCaptureData, setInitialCaptureData] = useState<{ url?: string, title?: string } | null>(null)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Global keyboard shortcuts
  useGlobalShortcuts({
    onGlobalSearch: () => setGlobalSearchOpen(true),
    onCapture: () => {
      setInitialCaptureData(null)
      setCaptureOpen(true)
    },
    onShortcuts: () => setShortcutsOpen(true),
  })

  useEffect(() => {
    const onOpenCapture = (e: any) => {
      if (e.detail) {
        setInitialCaptureData({ url: e.detail.url, title: e.detail.title })
      } else {
        setInitialCaptureData(null)
      }
      setCaptureOpen(true)
    }
    window.addEventListener('devdeck:open-capture', onOpenCapture)
    return () => window.removeEventListener('devdeck:open-capture', onOpenCapture)
  }, [])

  // Auto-capture from Share Target
  useEffect(() => {
    if (location.state?.autoCapture) {
      setCaptureOpen(true)
      // Clear state so it doesn't re-open on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            path="/"
            element={
              isLoggedIn() ? (
                <Navigate to="/items" replace />
              ) : (
                withTransition(<LandingPage />)
              )
            }
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
            path="/onboarding"
            element={<AuthGuard>{withTransition(<OnboardingPage />)}</AuthGuard>}
          />
          <Route
            path="/items/:id"
            element={<AuthGuard>{withTransition(<ItemDetailPage />)}</AuthGuard>}
          />
          <Route
            path="/capture-share"
            element={<AuthGuard>{withTransition(<CaptureSharePage />)}</AuthGuard>}
          />
          <Route
            path="/review"
            element={<AuthGuard>{withTransition(<TeamReviewPage />)}</AuthGuard>}
          />
          <Route
            path="/feed"
            element={<AuthGuard>{withTransition(<TeamFeedPage />)}</AuthGuard>}
          />
          <Route
            path="/following"
            element={<AuthGuard>{withTransition(<FollowingFeedPage />)}</AuthGuard>}
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
            path="/admin"
            element={<AuthGuard>{withTransition(<AdminDashboardPage />)}</AuthGuard>}
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
          <Route path="/waitlist" element={withTransition(<WaitlistPage />)} />
          <Route path="/u/:username" element={withTransition(<PublicProfilePage />)} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>

      {/* Global modals */}
      <UnifiedCommandPalette open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <CaptureModal
        open={captureOpen}
        onClose={() => {
          setCaptureOpen(false)
          setInitialCaptureData(null)
        }}
        onOpenItem={(id) => {
          setCaptureOpen(false)
          setInitialCaptureData(null)
          navigate(`/items/${id}`)
        }}
        source="manual"
        initialUrl={initialCaptureData?.url || location.state?.url}
        initialTitle={initialCaptureData?.title || location.state?.title}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  )
}

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AnimatedRoutes />
      </BrowserRouter>
      <Toaster />
      <ConfirmHost />
    </QueryClientProvider>
  )
}
