// Mirror of backend/internal/domain/items/item.go. Kept hand-written for
// Wave 4.5; in Ola 5 we'll generate it from OpenAPI.

export type ItemType =
  | 'repo'
  | 'cli'
  | 'plugin'
  | 'shortcut'
  | 'snippet'
  | 'agent'
  | 'prompt'
  | 'article'
  | 'tool'
  | 'workflow'
  | 'note'

export const ALL_ITEM_TYPES: readonly ItemType[] = [
  'repo',
  'cli',
  'plugin',
  'shortcut',
  'snippet',
  'agent',
  'prompt',
  'article',
  'tool',
  'workflow',
  'note',
]

export const EnrichmentStatus = {
  Pending: 'pending',
  Queued: 'queued',
  Ok: 'ok',
  Error: 'error',
  Skipped: 'skipped',
} as const

export type EnrichmentStatus = (typeof EnrichmentStatus)[keyof typeof EnrichmentStatus]


export interface Item {
  id: string
  item_type: ItemType
  title: string
  url: string | null
  url_normalized: string | null
  description: string | null
  notes: string
  tags: string[]
  why_saved: string
  when_to_use: string
  source_channel: string
  meta: Record<string, unknown>
  ai_summary: string
  ai_tags: string[]
  enrichment_status: EnrichmentStatus
  archived: boolean
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

export type CaptureSource =
  | 'manual'
  | 'browser-extension'
  | 'cli'
  | 'web-paste'
  | 'share-target'

/**
 * POST /api/items/capture request body. All fields optional except that
 * at least one of `url` or `text` must be present — the backend enforces
 * the constraint and returns 422 otherwise.
 */
export interface CaptureInput {
  source?: CaptureSource
  client_id?: string
  operation_id?: string
  url?: string
  text?: string
  selection?: string
  title_hint?: string
  type_hint?: ItemType
  tags?: string[]
  why_saved?: string
  meta_hints?: Record<string, unknown>
}

export interface CaptureResponse {
  item: Item | null
  enrichment_status: EnrichmentStatus
  duplicate_of: string | null
}
