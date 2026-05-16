// @devdeck/features — page components + feature modals/cards.
//
// Apps (desktop, web) import pages from here and mount them inside their
// own App shell (HashRouter vs BrowserRouter). App shells own routing and
// global providers.

// Hooks
export { useGlobalShortcuts } from './hooks/useGlobalShortcuts'

// Pages
export { HomePage } from './pages/HomePage'
export { ItemsPage } from './pages/ItemsPage'
export { ItemDetailPage } from './pages/ItemDetailPage'
export { CaptureSharePage } from './pages/CaptureSharePage'
export { TeamReviewPage } from './pages/TeamReviewPage'
export { TeamFeedPage } from './pages/TeamFeedPage'
export { FollowingFeedPage } from './pages/FollowingFeedPage'
export { LandingPage } from './pages/LandingPage'
export { RepoDetailPage } from './pages/RepoDetailPage'
export { DiscoveryPage } from './pages/DiscoveryPage'
export { SettingsPage } from './pages/SettingsPage'
export { AdminDashboardPage } from './pages/AdminDashboardPage'
export { WaitlistPage } from './pages/WaitlistPage'
export { PublicDeckPage } from './pages/PublicDeckPage'
export { PublicProfilePage } from './pages/PublicProfilePage'
export { CheatsheetsListPage } from './pages/CheatsheetsListPage'
export { CheatsheetDetailPage } from './pages/CheatsheetDetailPage'

// Components that apps might need directly (e.g. to embed a modal)
export { CaptureModal } from './components/CaptureModal'
export { GlobalSearchModal } from './components/GlobalSearchModal'
export { UnifiedCommandPalette } from './components/UnifiedCommandPalette'
export { AskResults } from './components/AskResults'
export { ShortcutsModal } from './components/ShortcutsModal'
export { SyncStatusIndicator } from './components/SyncStatusIndicator'
export { WorkspaceSwitcher } from './components/WorkspaceSwitcher'
export { Mascot } from './components/Mascot/Mascot'
export { NotificationCenter } from './components/NotificationCenter'
export { Topbar } from './components/Topbar'
export { Sidebar } from './components/Sidebar'
export { RepoCard } from './components/RepoCard'
export { RepoGrid } from './components/RepoGrid'
export { ItemCard } from './components/ItemCard'
export { AddRepoModal } from './components/AddRepoModal'
