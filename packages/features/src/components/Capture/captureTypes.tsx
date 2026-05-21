import {
  BookOpen,
  Code2,
  FileText,
  Github,
  Keyboard,
  Lightbulb,
  MessageSquareText,
  StickyNote,
  Terminal,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ItemType } from '@devdeck/api-client'

export type CaptureLaneId =
  | 'repo'
  | 'cli'
  | 'prompt'
  | 'snippet'
  | 'shortcut'
  | 'howto'
  | 'article-tool'
  | 'note'

export interface CaptureLane {
  id: CaptureLaneId
  itemType: ItemType
  label: string
  namePlaceholder: string
  primaryPlaceholder: string
  example: string
  defaultTags: string[]
  icon: LucideIcon
  primaryKind: 'url' | 'text'
  multiline: boolean
}

export const CAPTURE_LANES: CaptureLane[] = [
  {
    id: 'repo',
    itemType: 'repo',
    label: 'capture.lanes.repo.label',
    namePlaceholder: 'capture.lanes.repo.name_placeholder',
    primaryPlaceholder: 'capture.lanes.repo.primary_placeholder',
    example: 'capture.lanes.repo.example',
    defaultTags: ['repo', 'github'],
    icon: Github,
    primaryKind: 'url',
    multiline: false,
  },
  {
    id: 'cli',
    itemType: 'cli',
    label: 'capture.lanes.cli.label',
    namePlaceholder: 'capture.lanes.cli.name_placeholder',
    primaryPlaceholder: 'capture.lanes.cli.primary_placeholder',
    example: 'capture.lanes.cli.example',
    defaultTags: ['cli', 'terminal'],
    icon: Terminal,
    primaryKind: 'text',
    multiline: false,
  },
  {
    id: 'prompt',
    itemType: 'prompt',
    label: 'capture.lanes.prompt.label',
    namePlaceholder: 'capture.lanes.prompt.name_placeholder',
    primaryPlaceholder: 'capture.lanes.prompt.primary_placeholder',
    example: 'capture.lanes.prompt.example',
    defaultTags: ['prompt', 'ai'],
    icon: MessageSquareText,
    primaryKind: 'text',
    multiline: true,
  },
  {
    id: 'snippet',
    itemType: 'snippet',
    label: 'capture.lanes.snippet.label',
    namePlaceholder: 'capture.lanes.snippet.name_placeholder',
    primaryPlaceholder: 'capture.lanes.snippet.primary_placeholder',
    example: 'capture.lanes.snippet.example',
    defaultTags: ['snippet', 'code'],
    icon: Code2,
    primaryKind: 'text',
    multiline: true,
  },
  {
    id: 'shortcut',
    itemType: 'shortcut',
    label: 'capture.lanes.shortcut.label',
    namePlaceholder: 'capture.lanes.shortcut.name_placeholder',
    primaryPlaceholder: 'capture.lanes.shortcut.primary_placeholder',
    example: 'capture.lanes.shortcut.example',
    defaultTags: ['shortcut'],
    icon: Keyboard,
    primaryKind: 'text',
    multiline: false,
  },
  {
    id: 'howto',
    itemType: 'workflow',
    label: 'capture.lanes.howto.label',
    namePlaceholder: 'capture.lanes.howto.name_placeholder',
    primaryPlaceholder: 'capture.lanes.howto.primary_placeholder',
    example: 'capture.lanes.howto.example',
    defaultTags: ['workflow', 'how-to'],
    icon: Lightbulb,
    primaryKind: 'text',
    multiline: true,
  },
  {
    id: 'article-tool',
    itemType: 'tool',
    label: 'capture.lanes.article-tool.label',
    namePlaceholder: 'capture.lanes.article-tool.name_placeholder',
    primaryPlaceholder: 'capture.lanes.article-tool.primary_placeholder',
    example: 'capture.lanes.article-tool.example',
    defaultTags: ['tool'],
    icon: Wrench,
    primaryKind: 'url',
    multiline: false,
  },
  {
    id: 'note',
    itemType: 'note',
    label: 'capture.lanes.note.label',
    namePlaceholder: 'capture.lanes.note.name_placeholder',
    primaryPlaceholder: 'capture.lanes.note.primary_placeholder',
    example: 'capture.lanes.note.example',
    defaultTags: ['note'],
    icon: StickyNote,
    primaryKind: 'text',
    multiline: true,
  },
]

export function laneForType(type: ItemType): CaptureLane {
  if (type === 'article') return CAPTURE_LANES.find((lane) => lane.id === 'article-tool')!
  return CAPTURE_LANES.find((lane) => lane.itemType === type) ?? laneForId('note')
}

export function laneForId(id: CaptureLaneId): CaptureLane {
  return CAPTURE_LANES.find((lane) => lane.id === id) ?? CAPTURE_LANES[CAPTURE_LANES.length - 1]
}

export function iconForPreview(type: ItemType): LucideIcon {
  if (type === 'article') return BookOpen
  if (type === 'tool') return Wrench
  return laneForType(type).icon
}
