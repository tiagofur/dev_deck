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
  eyebrow: string
  microcopy: string
  namePlaceholder: string
  primaryLabel: string
  primaryPlaceholder: string
  secondaryLabel?: string
  secondaryPlaceholder?: string
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
    eyebrow: 'Proyecto o referencia',
    microcopy: 'proyecto, librería o referencia técnica',
    namePlaceholder: 'paperclipai/paperclip',
    primaryLabel: 'URL del repo o recurso',
    primaryPlaceholder: 'github.com/owner/repo',
    secondaryLabel: 'Notas rápidas',
    secondaryPlaceholder: 'por qué vale la pena revisarlo',
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
    eyebrow: 'Terminal reusable',
    microcopy: 'comando que quieres volver a usar',
    namePlaceholder: 'ripgrep install',
    primaryLabel: 'Comando',
    primaryPlaceholder: 'brew install ripgrep',
    secondaryLabel: 'Notas de uso',
    secondaryPlaceholder: 'cuándo conviene usarlo, flags importantes, gotchas',
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
    eyebrow: 'Instrucción IA',
    microcopy: 'instrucción reusable para IA',
    namePlaceholder: 'Code review prompt',
    primaryLabel: 'Prompt',
    primaryPlaceholder: 'Actúa como reviewer senior y encuentra riesgos...',
    secondaryLabel: 'Cuándo usarlo',
    secondaryPlaceholder: 'reviews, debugging, refactors, arquitectura',
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
    eyebrow: 'Código guardable',
    microcopy: 'bloque de código o patrón para reutilizar',
    namePlaceholder: 'React query retry helper',
    primaryLabel: 'Código',
    primaryPlaceholder: 'function retryDelay(attempt) { ... }',
    secondaryLabel: 'Contexto',
    secondaryPlaceholder: 'stack, archivo típico, problema que resuelve',
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
    eyebrow: 'Atajo o gesto',
    microcopy: 'atajo de teclado que no quieres olvidar',
    namePlaceholder: 'Command palette',
    primaryLabel: 'Atajo',
    primaryPlaceholder: 'Cmd+Shift+P',
    secondaryLabel: 'App / contexto',
    secondaryPlaceholder: 'VS Code, macOS, terminal...',
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
    eyebrow: 'Receta corta',
    microcopy: 'pasos, explicación o receta corta',
    namePlaceholder: 'Debug CORS',
    primaryLabel: 'Pasos o explicación',
    primaryPlaceholder: '1. Revisa headers\n2. Confirma preflight\n3. Verifica credentials',
    secondaryLabel: 'Cuándo usarlo',
    secondaryPlaceholder: 'debugging, deploy, onboarding, incidentes',
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
    eyebrow: 'Link útil',
    microcopy: 'artículo, docs, producto o herramienta',
    namePlaceholder: 'TypeScript Handbook',
    primaryLabel: 'URL',
    primaryPlaceholder: 'https://www.typescriptlang.org/docs/',
    secondaryLabel: 'Notas rápidas',
    secondaryPlaceholder: 'qué explica, para qué sirve, qué parte leer',
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
    eyebrow: 'Memoria libre',
    microcopy: 'idea, recordatorio o contexto suelto',
    namePlaceholder: 'Idea para auth flow',
    primaryLabel: 'Nota',
    primaryPlaceholder: 'Recordar revisar refresh tokens antes del release...',
    secondaryLabel: 'Contexto',
    secondaryPlaceholder: 'proyecto, fecha, persona, decisión',
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
