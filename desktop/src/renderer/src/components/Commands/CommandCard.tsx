import clsx from 'clsx'
import { Copy, Edit3, GripVertical, Trash2 } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import type { CommandCategory, RepoCommand } from '../../features/commands/types'
import { showToast } from '../../lib/toast'

interface Props {
  command: RepoCommand
  /** Spread these onto the drag handle so dnd-kit can listen to it. */
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  onEdit?: () => void
  onDelete?: () => void
  isDragging?: boolean
}

const categoryColors: Record<CommandCategory, string> = {
  install: 'bg-accent-cyan',
  dev:     'bg-accent-lime',
  test:    'bg-accent-yellow',
  build:   'bg-accent-orange',
  deploy:  'bg-accent-pink text-white',
  lint:    'bg-accent-lavender',
  db:      'bg-bg-elevated',
  other:   'bg-bg-elevated',
}

export function CommandCard({
  command,
  dragHandleProps,
  onEdit,
  onDelete,
  isDragging,
}: Props) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(command.command)
      showToast(`${command.label} copiado`)
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  return (
    <div
      className={clsx(
        'bg-bg-card border-3 border-ink shadow-hard p-4 transition-shadow',
        isDragging && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Mover"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent-yellow border-2 border-transparent hover:border-ink touch-none"
          {...dragHandleProps}
        >
          <GripVertical size={16} strokeWidth={3} />
        </button>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-display font-bold uppercase text-base truncate">
              {command.label}
            </h4>
            {command.category && (
              <span
                className={clsx(
                  'shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border-2 border-ink',
                  categoryColors[command.category],
                )}
              >
                {command.category}
              </span>
            )}
          </div>
          <code className="block bg-ink text-bg-primary font-mono text-xs px-3 py-2 border-2 border-ink overflow-x-auto whitespace-nowrap">
            {command.command}
          </code>
          {command.description && (
            <p className="text-xs text-ink-soft font-mono mt-2">
              {command.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={copy}
            aria-label="Copiar"
            title="Copiar al clipboard"
            className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-lime
                       active:translate-x-[1px] active:translate-y-[1px] transition-transform"
          >
            <Copy size={14} strokeWidth={3} />
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar"
              className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-yellow
                         active:translate-x-[1px] active:translate-y-[1px] transition-transform"
            >
              <Edit3 size={14} strokeWidth={3} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Borrar"
              className="border-2 border-ink p-1.5 bg-bg-card hover:bg-danger hover:text-white
                         active:translate-x-[1px] active:translate-y-[1px] transition-transform"
            >
              <Trash2 size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
