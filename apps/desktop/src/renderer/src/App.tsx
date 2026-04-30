import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import {
  CheatsheetDetailPage,
  CheatsheetsListPage,
  DiscoveryPage,
  HomePage,
  ItemDetailPage,
  ItemsPage,
  RepoDetailPage,
  SettingsPage,
} from '@devdeck/features'
import { ConfirmHost, PageTransition, Toaster } from '@devdeck/ui'
import { PasteInterceptor } from './components/PasteInterceptor'

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
          path="/items"
          element={
            <PageTransition>
              <ItemsPage />
            </PageTransition>
          }
        />
        <Route
          path="/items/:id"
          element={
            <PageTransition>
              <ItemDetailPage />
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
