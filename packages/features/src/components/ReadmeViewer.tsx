import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'
import { useReadme } from '@devdeck/api-client'

interface Props {
  repoId: string
  source: 'github' | 'generic'
  repoUrl?: string
}

// https://github.com/owner/repo  →  https://raw.githubusercontent.com/owner/repo/HEAD/
function getRawBase(repoUrl?: string): string {
  if (!repoUrl) return ''
  const m = repoUrl.match(/github\.com\/([^/?#]+\/[^/?#]+)/)
  return m ? `https://raw.githubusercontent.com/${m[1]}/HEAD/` : ''
}

function resolveUrl(base: string, url: string): string {
  if (!url || !base) return url
  if (/^https?:\/\//i.test(url) || url.startsWith('//') || url.startsWith('data:')) return url
  try { return new URL(url, base).href } catch { return url }
}

export function ReadmeViewer({ repoId, source, repoUrl }: Props) {
  const enabled = source === 'github'
  const { data, isLoading, error } = useReadme(repoId, enabled)
  const rawBase = getRawBase(repoUrl)

  if (!enabled) {
    return (
      <EmptyReadme>
        Este repo no es de GitHub. README no disponible vía API.
      </EmptyReadme>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-bg-card border-3 border-ink shadow-hard p-8 text-center font-mono text-ink-soft">
        Bajando README de GitHub…
      </div>
    )
  }

  if (error || !data) {
    return <EmptyReadme>Este repo no tiene README, o no se pudo bajar.</EmptyReadme>
  }

  return (
    <article className="bg-bg-card border-3 border-ink shadow-hard p-8">
      <div className="markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          urlTransform={(url) => resolveUrl(rawBase, url)}
        >
          {data.content}
        </ReactMarkdown>
      </div>
    </article>
  )
}

function EmptyReadme({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard p-12 text-center">
      <FileText
        size={48}
        strokeWidth={2.5}
        className="mx-auto mb-4 text-ink-soft"
      />
      <p className="font-display font-bold uppercase text-lg mb-1">
        Sin README
      </p>
      <p className="text-sm text-ink-soft font-mono">{children}</p>
    </div>
  )
}
