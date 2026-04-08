import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CheatsheetDetailPage } from './app/CheatsheetDetailPage'
import { CheatsheetsListPage } from './app/CheatsheetsListPage'
import { DiscoveryPage } from './app/DiscoveryPage'
import { HomePage } from './app/HomePage'
import { RepoDetailPage } from './app/RepoDetailPage'
import { SettingsPage } from './app/SettingsPage'
import { ConfirmHost } from './components/ConfirmHost'
import { PageTransition } from './components/PageTransition'
import { PasteInterceptor } from './components/PasteInterceptor'
import { Toaster } from './components/Toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />
        <Route
          path="/repo/:id"
          element={
            <PageTransition>
              <RepoDetailPage />
            </PageTransition>
          }
        />
        <Route
          path="/discovery"
          element={
            <PageTransition>
              <DiscoveryPage />
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <SettingsPage />
            </PageTransition>
          }
        />
        <Route
          path="/cheatsheets"
          element={
            <PageTransition>
              <CheatsheetsListPage />
            </PageTransition>
          }
        />
        <Route
          path="/cheatsheets/:id"
          element={
            <PageTransition>
              <CheatsheetDetailPage />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AnimatedRoutes />
      </HashRouter>
      <Toaster />
      <ConfirmHost />
      {/* Wave 4.5 §16.12 — global paste listener + Cmd/Ctrl+Shift+V shortcut. */}
      <PasteInterceptor />
    </QueryClientProvider>
  )
}
