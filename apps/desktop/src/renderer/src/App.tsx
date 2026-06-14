import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import {
  CheatsheetDetailPage,
  CheatsheetsListPage,
  CaptureModal,
  CircleDetailPage,
  CircleJoinPage,
  CirclesPage,
  DiscoveryPage,
  HomePage,
  ItemDetailPage,
  ItemsPage,
  RepoDetailPage,
  SettingsPage,
  OnboardingPage,
  AdminDashboardPage,
  PublicDeckPage,
  PublicProfilePage,
  ProfilePage,
  ShortcutsModal,
  TeamReviewPage,
  RunbooksPage,
  TeamFeedPage,
  FollowingFeedPage,
  WorkbenchPage,
  UnifiedCommandPalette,
  useGlobalShortcuts,
} from '@devdeck/features'
import { ConfirmHost, PageTransition, Toaster } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { isLoggedIn, useMe } from '@devdeck/api-client'
import { PasteInterceptor } from './components/PasteInterceptor'
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

function AuthGuard({ children }: { children: ReactElement }): ReactElement {
  const { t } = useTranslation()
  const { data: user, isLoading, isError, error, refetch } = useMe()
  const location = useLocation()

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <AuthStatusScreen
        title={t('common.loading')}
        message={t('profile.edit_loading_msg')}
      />
    )
  }

  if (isError) {
    return (
      <AuthStatusScreen
        title={t('common.auth_failed_title')}
        message={(error as Error)?.message || t('common.auth_failed_msg')}
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="border-3 border-ink bg-accent-yellow px-4 py-2 font-display font-black uppercase shadow-hard"
          >
            {t('common.retry')}
          </button>
        }
      />
    )
  }

  if (user && !user.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

function AuthStatusScreen({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}): ReactElement {
  return (
    <div className="h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="bg-bg-card border-3 border-ink shadow-hard p-6 max-w-md text-center">
        <p className="font-display font-black uppercase text-xl">{title}</p>
        <p className="font-mono text-sm text-ink-soft mt-2">{message}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  )
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
    const pending = window.electronAPI?.auth.getPendingCallbackURL()
    if (pending) {
      navigate(desktopCallbackPath(pending), { replace: true })
    }
    return window.electronAPI?.auth.onCallbackURL((url: string) => {
      navigate(desktopCallbackPath(url), { replace: true })
    })
  }, [navigate])

  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [initialCaptureData, setInitialCaptureData] = useState<{ url?: string, title?: string } | null>(null)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useGlobalShortcuts({
    onGlobalSearch: () => setGlobalSearchOpen(true),
    onCapture: () => {
      setInitialCaptureData(null)
      setCaptureOpen(true)
    },
    onShortcuts: () => setShortcutsOpen(true),
  })

  useEffect(() => {
    const onOpenCapture = (e: Event) => {
      const detail = (e as CustomEvent<{ url?: string; title?: string }>).detail
      if (detail) {
        setInitialCaptureData({ url: detail.url, title: detail.title })
      } else {
        setInitialCaptureData(null)
      }
      setCaptureOpen(true)
    }
    const onOpenSearch = () => {
      setGlobalSearchOpen(true)
    }
    window.addEventListener('devdeck:open-capture', onOpenCapture)
    window.addEventListener('devdeck:open-search', onOpenSearch)
    return () => {
      window.removeEventListener('devdeck:open-capture', onOpenCapture)
      window.removeEventListener('devdeck:open-search', onOpenSearch)
    }
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    return api.onShortcut((name) => {
      if (name === 'search') setGlobalSearchOpen(true)
      if (name === 'add') {
        setInitialCaptureData(null)
        setCaptureOpen(true)
      }
    })
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
            path="/onboarding"
            element={
              <AuthGuard>{withTransition(<OnboardingPage />)}</AuthGuard>
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
            path="/profile"
            element={
              <AuthGuard>{withTransition(<ProfilePage />)}</AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>{withTransition(<SettingsPage />)}</AuthGuard>
            }
          />
          <Route
            path="/workbench"
            element={
              <AuthGuard>{withTransition(<WorkbenchPage />)}</AuthGuard>
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
            path="/runbooks"
            element={
              <AuthGuard>{withTransition(<RunbooksPage />)}</AuthGuard>
            }
          />
          <Route
            path="/cheatsheets/:id"
            element={
              <AuthGuard>{withTransition(<CheatsheetDetailPage />)}</AuthGuard>
            }
          />
          <Route
            path="/circles"
            element={
              <AuthGuard>{withTransition(<CirclesPage />)}</AuthGuard>
            }
          />
          <Route
            path="/circles/:id"
            element={
              <AuthGuard>{withTransition(<CircleDetailPage />)}</AuthGuard>
            }
          />
          <Route
            path="/circles/join/:inviteCode"
            element={
              <AuthGuard>{withTransition(<CircleJoinPage />)}</AuthGuard>
            }
          />
          <Route path="/deck/:slug" element={withTransition(<PublicDeckPage />)} />
          <Route path="/u/:username" element={withTransition(<PublicProfilePage />)} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
      <UnifiedCommandPalette open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <CaptureModal
        open={captureOpen}
        onClose={() => {
          setCaptureOpen(false)
          setInitialCaptureData(null)
        }}
        onOpenItem={(id, item) => {
          setCaptureOpen(false)
          setInitialCaptureData(null)
          navigate(item?.item_type === 'repo' ? `/repo/${id}` : `/items/${id}`)
        }}
        source="manual"
        initialUrl={initialCaptureData?.url}
        initialTitle={initialCaptureData?.title}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <PasteInterceptor onOpenItem={(id, item) => navigate(item?.item_type === 'repo' ? `/repo/${id}` : `/items/${id}`)} />
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
