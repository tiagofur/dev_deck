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
} from './auth/auth'
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
  useMarkItemSeen,
  ITEMS_KEY,
} from './features/items/api'
export type {
  ListItemsParams,
  ListItemsResult,
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

// Feature hooks — capture
export { useCapture } from './features/capture/api'
export {
  detectType,
  quickDetectFromClipboard,
  looksLikeURL,
} from './features/capture/detect'
export type { DetectionResult } from './features/capture/detect'
export type {
  Item,
  ItemType,
  EnrichmentStatus,
  CaptureInput,
  CaptureResponse,
  CaptureSource,
} from './features/capture/types'
export { ALL_ITEM_TYPES } from './features/capture/types'
