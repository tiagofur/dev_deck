import {
  Archive,
  ArchiveRestore,
  Copy,
  ExternalLink,
  RefreshCw,
  Share2,
  Terminal,
  Trash2,
} from 'lucide-react'
import { Button } from '@devdeck/ui'
import type { Repo } from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'

interface Props {
  repo: Repo
  onArchiveToggle: () => void
  onDelete: () => void
  onRefresh: () => void
  archiving?: boolean
  refreshing?: boolean
}

export function ActionsBar({
  repo,
  onArchiveToggle,
  onDelete,
  onRefresh,
  archiving,
  refreshing,
}: Props) {
  function openInBrowser() {
    // Electron main process intercepts window.open and routes to OS browser.
    window.open(repo.url, '_blank', 'noopener,noreferrer')
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} copiado`)
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: repo.name,
          text: repo.description ?? repo.name,
          url: repo.url,
        })
      } catch {
        /* user canceled */
      }
    } else {
      void copy(repo.url, 'URL')
    }
  }

  const cloneCmd =
    repo.source === 'github'
      ? `git clone ${repo.url}.git`
      : `git clone ${repo.url}`

  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
      <h3 className="font-display font-black uppercase text-sm tracking-widest mb-4">
        Acciones
      </h3>

      <div className="grid grid-cols-1 gap-2">
        <Button variant="primary" onClick={openInBrowser}>
          <span className="flex items-center justify-center gap-2">
            <ExternalLink size={16} strokeWidth={3} />
            Abrir en browser
          </span>
        </Button>

        <Button variant="secondary" onClick={() => copy(repo.url, 'URL')}>
          <span className="flex items-center justify-center gap-2">
            <Copy size={16} strokeWidth={3} />
            Copiar URL
          </span>
        </Button>

        <Button variant="secondary" onClick={() => copy(cloneCmd, 'git clone')}>
          <span className="flex items-center justify-center gap-2">
            <Terminal size={16} strokeWidth={3} />
            Copiar git clone
          </span>
        </Button>

        <Button variant="secondary" onClick={share}>
          <span className="flex items-center justify-center gap-2">
            <Share2 size={16} strokeWidth={3} />
            Compartir
          </span>
        </Button>

        <Button variant="accent" onClick={onRefresh} disabled={refreshing}>
          <span className="flex items-center justify-center gap-2">
            <RefreshCw size={16} strokeWidth={3} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refrescando…' : 'Refrescar metadata'}
          </span>
        </Button>

        <div className="border-t-2 border-ink/20 my-2" />

        <Button variant="secondary" onClick={onArchiveToggle} disabled={archiving}>
          <span className="flex items-center justify-center gap-2">
            {repo.archived ? (
              <>
                <ArchiveRestore size={16} strokeWidth={3} />
                Desarchivar
              </>
            ) : (
              <>
                <Archive size={16} strokeWidth={3} />
                Archivar
              </>
            )}
          </span>
        </Button>

        <Button variant="danger" onClick={onDelete}>
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={16} strokeWidth={3} />
            Borrar
          </span>
        </Button>
      </div>
    </div>
  )
}
