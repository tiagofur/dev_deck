import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Binary,
  Braces,
  CalendarClock,
  Clipboard,
  Fingerprint,
  Hash,
  KeyRound,
  Link,
  ShieldCheck,
  FolderGit2,
  ScanSearch,
  ShieldAlert,
  Send,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'

// Import modular tool components
import { JsonTool } from '../components/Workbench/JsonTool'
import { JwtTool } from '../components/Workbench/JwtTool'
import { TransformTool } from '../components/Workbench/TransformTool'
import { UuidTool } from '../components/Workbench/UuidTool'
import { TimestampTool } from '../components/Workbench/TimestampTool'
import { HashTool } from '../components/Workbench/HashTool'
import { RegexTool } from '../components/Workbench/RegexTool'
import { SecretScannerTool } from '../components/Workbench/SecretScannerTool'
import { ApiTool } from '../components/Workbench/ApiTool'
import { ProjectContextTool } from '../components/Workbench/ProjectContextTool'
import { SnippetExpanderTool } from '../components/Workbench/SnippetExpanderTool'

type ToolId = 'json' | 'jwt' | 'base64' | 'url' | 'uuid' | 'timestamp' | 'hash' | 'regex' | 'secrets' | 'api' | 'project' | 'expander'

const tools: {
  id: ToolId
  label: string
  description: string
  icon: typeof Braces
}[] = [
  { id: 'json', label: 'JSON', description: 'Format and validate payloads locally.', icon: Braces },
  { id: 'jwt', label: 'JWT', description: 'Decode header and payload without verification.', icon: KeyRound },
  { id: 'base64', label: 'Base64', description: 'Encode or decode UTF-8 text.', icon: Binary },
  { id: 'url', label: 'URL', description: 'Encode or decode URL components.', icon: Link },
  { id: 'uuid', label: 'UUID', description: 'Generate UUID v4 values.', icon: Fingerprint },
  { id: 'timestamp', label: 'Time', description: 'Convert UNIX timestamps and dates.', icon: CalendarClock },
  { id: 'hash', label: 'Hash', description: 'Generate SHA digests locally.', icon: Hash },
  { id: 'regex', label: 'Regex', description: 'Test expressions against sample text.', icon: ScanSearch },
  { id: 'secrets', label: 'Secrets', description: 'Scan text for leaked tokens locally.', icon: ShieldAlert },
  { id: 'api', label: 'API', description: 'Send quick HTTP requests and save configs.', icon: Send },
  { id: 'project', label: 'Project', description: 'Surface context for a repo or project.', icon: FolderGit2 },
  { id: 'expander', label: 'Aliases', description: 'Preview explicit snippet expansions locally.', icon: Clipboard },
]

export function WorkbenchPage() {
  const [searchParams] = useSearchParams()
  const requestedTool = searchParams.get('tool')
  const [activeTool, setActiveTool] = useState<ToolId>(
    isToolId(requestedTool) ? requestedTool : 'json'
  )

  useEffect(() => {
    if (isToolId(requestedTool) && requestedTool !== activeTool) {
      setActiveTool(requestedTool)
    }
  }, [activeTool, requestedTool])

  return (
    <AppShell contentClassName="flex-1 overflow-auto">
      <main className="min-h-full overflow-x-hidden bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="flex flex-col gap-3 border-b-3 border-ink pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 border-3 border-ink bg-accent-lime px-3 py-1 font-display text-xs font-black uppercase shadow-hard-sm">
                <ShieldCheck size={15} strokeWidth={3} />
                Local-first
              </div>
              <h1 className="font-display text-4xl font-black uppercase tracking-tight">
                Developer Workbench
              </h1>
              <p className="mt-2 max-w-3xl font-mono text-sm text-ink-soft">
                Small offline utilities connected to your DevDeck vault. Inputs stay in this
                browser/app session unless you choose to save an output.
              </p>
            </div>
          </header>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-3 border-ink bg-bg-card p-3 shadow-hard lg:sticky lg:top-5 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
                {tools.map((tool) => {
                  const Icon = tool.icon
                  const active = activeTool === tool.id
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex min-w-[11rem] items-start gap-3 border-2 border-ink p-3 text-left transition-all lg:min-w-0 ${
                        active
                          ? 'bg-accent-yellow shadow-hard-sm'
                          : 'bg-bg-elevated hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                      }`}
                    >
                      <Icon size={18} strokeWidth={3} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-display text-sm font-black uppercase">
                          {tool.label}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-ink-soft">
                          {tool.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="min-w-0 overflow-hidden border-3 border-ink bg-bg-card shadow-hard">
              {activeTool === 'json' && <JsonTool />}
              {activeTool === 'jwt' && <JwtTool />}
              {activeTool === 'base64' && <TransformTool tool="base64" />}
              {activeTool === 'url' && <TransformTool tool="url" />}
              {activeTool === 'uuid' && <UuidTool />}
              {activeTool === 'timestamp' && <TimestampTool />}
              {activeTool === 'hash' && <HashTool />}
              {activeTool === 'regex' && <RegexTool />}
              {activeTool === 'secrets' && <SecretScannerTool />}
              {activeTool === 'api' && <ApiTool />}
              {activeTool === 'project' && <ProjectContextTool />}
              {activeTool === 'expander' && <SnippetExpanderTool />}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

function isToolId(value: string | null): value is ToolId {
  return tools.some((tool) => tool.id === value)
}
