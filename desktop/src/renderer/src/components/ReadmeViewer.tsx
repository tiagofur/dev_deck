import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'
import { useReadme } from '../features/repos/api'

interface Props {
  repoId: string
  source: 'github' | 'generic'
}

export function ReadmeViewer({ repoId, source }: Props) {
  // Only github repos have a README via the API. Skip the request entirely
  // for generic sources to avoid an unnecessary 404.
  const enabled = source === 'github'
  const { data, isLoading, error } = useReadme(repoId, enabled)

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
          rehypePlugins={[rehypeHighlight]}
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
