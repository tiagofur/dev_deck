// @devdeck/api-client — public surface.

// Config + fetch wrapper
export { api, APIError } from './api-client'
export { configureApiClient, getConfig } from './config'
export type { ApiClientConfig } from './config'

// Auth + storage adapters
export {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isLoggedIn,
  parseTokensFromFragment,
  parseTokensFromQuery,
  parseAuthErrorFromQuery,
  fetchAuthProviders,
  logoutCurrentSession,
  registerUser,
  loginStep1,
  loginLocal,
  forgotPassword,
  resetPassword,
  changePassword,
} from './auth/auth'
export type { AuthProviderInfo } from './auth/auth'
export {
  setTokenStorage,
  getTokenStorage,
} from './auth/storage/types'
export type { TokenStorage } from './auth/storage/types'
export { localStorageAdapter } from './auth/storage/localStorage'
export { electronSafeStorageAdapter } from './auth/storage/electron'
// Shared utilities
export { formatCount } from './format'
export {
  getPreferences,
  setPreferences,
  subscribePreferences,
  usePreferences,
} from './preferences'
export type { Preferences } from './preferences'

// Local DB + Sync (Ola 6)
export { getLocalDB, queryLocal, execLocal } from './local-db/client'
export { enqueueSync, getPendingOps, markSynced, getPendingCount } from './sync/queue'
export { startSyncEngine, stopSyncEngine, syncNow } from './sync/engine'

// Feature hooks — sync (Ola 6)
export { useDevices, useDeleteDevice } from './features/sync/api'

// Feature hooks — users (Ola 6)
export {
  useMe,
  useUpdateMe,
  useUploadAvatar,
  usePublicProfile,
  useUserPublicDecks,
  useAdminUsers,
  useJoinWaitlist,
  useAdminWaitlist,
  useAdminInvites,
  useCreateInvite,
  useFollowUser,
  useUnfollowUser,
  useFollowingFeed,
  useCompleteOnboarding,
  useOnboardingKits,
  useInstallStarterKit,
  useRemoveDemoData,
} from './features/users/api'
export type { User, PublicProfile, UpdateUserInput, FeedEvent, StarterKit } from './features/users/api'

// Feature hooks — notifications (Ola 8)
export {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './features/notifications/api'
export type { Notification } from './features/notifications/api'

// Feature hooks — orgs (Ola 9)
export { 
  useUserOrgs, 
  useCreateOrg, 
  useAddOrgMember, 
  useOrgFeed, 
  useOrgSAML, 
  useUpdateOrgSAML, 
  useGenerateSCIMToken, 
  useOrgInsights,
  useOrgTrendingTags,
  useOrgRecommendations
} from './features/orgs/api'
export type { Organization, ActivityEntry, SAMLConfig, OrgInsights, HotTopic, Recommendation } from './features/orgs/api'

// Feature hooks — ecosystem (Ola 10)
export {
  useAPIKeys,
  useCreateAPIKey,
  useDeleteAPIKey,
  useCustomEnrichers,
  useCreateCustomEnricher,
  useDeleteCustomEnricher,
  useFeaturedPlugins,
} from './features/ecosystem/api'
export type { APIKey, CreateKeyResponse, CustomEnricher, PluginTemplate } from './features/ecosystem/api'

// Feature hooks — webhooks (Ola 10)
export { useWebhooks, useCreateWebhook, useDeleteWebhook } from './features/webhooks/api'
export type { Webhook } from './features/webhooks/api'

// Feature hooks — discovery (Ola 12)
export {
  useTrendingTools,
  useCuratorLeaderboard,
} from './features/discovery/api'
export type { TrendingItem, CuratorRanking } from './features/discovery/api'

// Feature hooks — repos
export {
  useRepos,
  useRepo,
  useReadme,
  useAddRepo,
  useUpdateRepo,
  useDeleteRepo,
  useRefreshRepo,
  useDiscoveryNext,
  useMarkSeen,
} from './features/repos/api'
export type {
  Repo,
  ListResult,
  CreateRepoInput,
  UpdateRepoInput,
  ListReposParams,
} from './features/repos/types'

// Feature hooks — items
export {
	useItems,
	useItem,
	useUpdateItem,
	useDeleteItem,
	useAIEnrichItem,
	useReviewItemAITags,
	useRelatedItems,
	useMarkItemSeen,
	useUserTags,
	ITEMS_KEY,
} from './features/items/api'
export type {
	ListItemsParams,
	ListItemsResult,
	ReviewAITagsInput,
	UpdateItemInput,
} from './features/items/api'

// Feature hooks — commands
export {
  useCommands,
  useAddCommand,
  useUpdateCommand,
  useDeleteCommand,
  useReorderCommands,
  usePackageScripts,
  useBatchCreateCommands,
} from './features/commands/api'
export type {
  RepoCommand,
  CommandCategory,
  CreateCommandInput,
  UpdateCommandInput,
  PackageScript,
} from './features/commands/types'

// Feature hooks — cheatsheets
export {
  useCheatsheets,
  useCheatsheet,
  useExploreCheatsheets,
  useCreateCheatsheet,
  useUpdateCheatsheet,
  useDeleteCheatsheet,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
  useRepoCheatsheets,
  useLinkCheatsheet,
  useUnlinkCheatsheet,
  useGlobalSearch,
} from './features/cheatsheets/api'
export type {
  Cheatsheet,
  CheatsheetDetail,
  Entry,
  CreateCheatsheetInput,
  UpdateCheatsheetInput,
  CreateEntryInput,
  UpdateEntryInput,
  SearchResult,
} from './features/cheatsheets/types'

// Feature hooks — stats
export { useStats } from './features/stats/api'
export type { Stats, MascotMood } from './features/stats/types'

// Feature hooks — ask
export { useAsk } from './features/ask/api'
export type { AskRequest, AskResponse, AskCitation } from './features/ask/api'

// Feature hooks — capture
export { useCapture } from './features/capture/api'
export { usePreview } from './features/capture/preview'
export type { PreviewInput, PreviewResponse } from './features/capture/preview'
export {
  detectType,
  quickDetectFromClipboard,
  looksLikeURL,
  looksLikePotentialURL,
  normalizeURLInput,
  parseCaptureTags,
  suggestCaptureTags,
} from './features/capture/detect'
export type { DetectionResult } from './features/capture/detect'
export type {
  Item,
  ItemType,
  CaptureInput,
  CaptureResponse,
  CaptureSource,
} from './features/capture/types'
export { ALL_ITEM_TYPES, EnrichmentStatus } from './features/capture/types'

// Feature hooks — circles
export {
  useCircles,
  useCircleDetail,
  useCircleItems,
  useCircleMembers,
  useCreateCircle,
  useJoinCircle,
  useShareToCircle,
  useLeaveCircle,
} from './features/circles/api'
export type {
  Circle,
  CircleMemberDetail,
  CreateCircleInput,
  JoinCircleInput,
  ShareToCircleInput,
} from './features/circles/api'

// Feature hooks — decks
export {
  useDecks,
  useCreateDeck,
  useUpdateDeck,
  useDeleteDeck,
  useDeckDetail,
  useAddDeckItems,
  useRemoveDeckItem,
  usePublicDeck,
  useImportDeck,
  useStarDeck,
  addRecentDeck,
  getRecentDeckIds,
  setLastUsedDeck,
  getLastUsedDeck,
} from './features/decks/api'

// Feature hooks — runbooks (Ola 5+)
export {
	useRunbooks,
	useItemRunbooks,
	useCreateRunbook,
	useAddRunbookStep,
	useUpdateRunbookStep,
	useDeleteRunbook,
} from './features/runbooks/api'
export type { Runbook, RunbookStep, RunbookWithItem } from './features/runbooks/api'
export type {
  Deck,
  CreateDeckInput,
  UpdateDeckInput,
  AddItemsInput,
  DeckItem,
} from './features/decks/api'

// Feature hooks — system
export { useImportGithubStars } from './features/import/api'
export type { StarsImportInput, StarsImportResult } from './features/import/api'

export { useSystemConfig, useFeatureFlags } from './features/system/api'
export type { SystemConfig, SystemFeatures } from './features/system/api'

