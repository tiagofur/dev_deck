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
    label: 'Repo / URL',
    namePlaceholder: 'paperclipai/paperclip',
    primaryPlaceholder: 'github.com/owner/repo',
    example: 'github.com/charmbracelet/bubbletea',
    defaultTags: ['repo', 'github'],
    icon: Github,
    primaryKind: 'url',
    multiline: false,
  },
  {
    id: 'cli',
    itemType: 'cli',
    label: 'CLI Command',
    namePlaceholder: 'ripgrep install',
    primaryPlaceholder: 'brew install ripgrep',
    example: 'docker run --rm -it node:22',
    defaultTags: ['cli', 'terminal'],
    icon: Terminal,
    primaryKind: 'text',
    multiline: false,
  },
  {
    id: 'prompt',
    itemType: 'prompt',
    label: 'Prompt',
    namePlaceholder: 'Code review prompt',
    primaryPlaceholder: 'Actúa como reviewer senior y encuentra riesgos...',
    example: 'SQL explainer para queries lentas',
    defaultTags: ['prompt', 'ai'],
    icon: MessageSquareText,
    primaryKind: 'text',
    multiline: true,
  },
  {
    id: 'snippet',
    itemType: 'snippet',
    label: 'Snippet',
    namePlaceholder: 'React query retry helper',
    primaryPlaceholder: 'function retryDelay(attempt) { ... }',
    example: 'middleware de auth para Go/Chi',
    defaultTags: ['snippet', 'code'],
    icon: Code2,
    primaryKind: 'text',
    multiline: true,
  },
  {
    id: 'shortcut',
    itemType: 'shortcut',
    label: 'Shortcut',
    namePlaceholder: 'Command palette',
    primaryPlaceholder: 'Cmd+Shift+P',
    example: 'Ctrl+R para history search',
    defaultTags: ['shortcut'],
    icon: Keyboard,
    primaryKind: 'text',
    multiline: false,
  },
  {
    id: 'howto',
    itemType: 'workflow',
    label: 'Tip / How-to',
    namePlaceholder: 'Debug CORS',
    primaryPlaceholder: '1. Revisa headers\n2. Confirma preflight\n3. Verifica credentials',
    example: 'Deploy checklist para VPS',
    defaultTags: ['workflow', 'how-to'],
    icon: Lightbulb,
    primaryKind: 'text',
    multiline: true,
  },
  {
    id: 'article-tool',
    itemType: 'tool',
    label: 'Article / Tool',
    namePlaceholder: 'TypeScript Handbook',
    primaryPlaceholder: 'https://www.typescriptlang.org/docs/',
    example: 'docs, blog post, playground, SaaS devtool',
    defaultTags: ['tool'],
    icon: Wrench,
    primaryKind: 'url',
    multiline: false,
  },
  {
    id: 'note',
    itemType: 'note',
    label: 'Note',
    namePlaceholder: 'Idea para auth flow',
    primaryPlaceholder: 'Recordar revisar refresh tokens antes del release...',
    example: 'decisión técnica o aprendizaje rápido',
    defaultTags: ['note'],
    icon: StickyNote,
    primaryKind: 'text',
    multiline: true,
  },
]

export function laneForType(type: ItemType): CaptureLane {
  if (type === 'article') return CAPTURE_LANES.find((lane) => lane.id === 'article-tool')!
  return CAPTURE_LANES.find((lane) => lane.itemType === type) ?? CAPTURE_LANES[7]
}

export function laneForId(id: CaptureLaneId): CaptureLane {
  return CAPTURE_LANES.find((lane) => lane.id === id) ?? CAPTURE_LANES[7]
}

export function iconForPreview(type: ItemType): LucideIcon {
  if (type === 'article') return BookOpen
  if (type === 'tool') return Wrench
  return laneForType(type).icon
}
