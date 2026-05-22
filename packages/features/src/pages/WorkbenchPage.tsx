import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Binary,
  Braces,
  CalendarClock,
  Clipboard,
  Fingerprint,
  Hash,
  KeyRound,
  Link,
  Save,
  ShieldAlert,
  ShieldCheck,
  Send,
  FolderGit2,
  ScanSearch,
} from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useCapture, useGlobalSearch, useItem, useUpdateItem, type SearchResult } from '@devdeck/api-client'
import { AppShell } from '../components/AppShell'
import {
  dateToUnixTimestamp,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  formatJson,
  generateUuid,
  hashText,
  parseCurlCommand,
  parseHeaders,
  requestConfigToCurl,
  scanSecrets,
  serializeRequestConfig,
  testRegex,
  timestampToDate,
} from '../workbench/utils'

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
      <main className="min-h-full bg-bg-primary p-6">
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

          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-3 border-ink bg-bg-card p-3 shadow-hard h-fit">
              <div className="grid gap-2">
                {tools.map((tool) => {
                  const Icon = tool.icon
                  const active = activeTool === tool.id
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex items-start gap-3 border-2 border-ink p-3 text-left transition-all ${
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

            <section className="min-w-0 border-3 border-ink bg-bg-card shadow-hard">
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

function ToolFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="border-b-3 border-ink bg-bg-elevated px-5 py-4">
        <h2 className="font-display text-2xl font-black uppercase">{title}</h2>
      </div>
      <div className="grid gap-5 p-5">{children}</div>
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="font-display text-xs font-black uppercase tracking-widest">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        className="min-h-48 w-full resize-y border-3 border-ink bg-bg-primary p-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
      />
    </label>
  )
}

function ResultActions({
  output,
  title,
  itemType = 'snippet',
}: {
  output: string
  title: string
  itemType?: 'snippet' | 'note'
}) {
  const capture = useCapture()

  async function copy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    showToast('Copied to clipboard', 'success')
  }

  async function save() {
    if (!output.trim()) return
    try {
      await capture.mutateAsync({
        source: 'manual',
        text: output,
        title_hint: title,
        type_hint: itemType,
        tags: ['workbench'],
        why_saved: 'Generated from DevDeck Workbench.',
      })
      showToast('Saved to your vault', 'success')
    } catch {
      showToast('Could not save output', 'error')
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" size="sm" variant="secondary" onClick={copy} disabled={!output}>
        <span className="flex items-center gap-2">
          <Clipboard size={15} strokeWidth={3} />
          Copy
        </span>
      </Button>
      <Button type="button" size="sm" onClick={save} disabled={!output || capture.isPending}>
        <span className="flex items-center gap-2">
          <Save size={15} strokeWidth={3} />
          Save output
        </span>
      </Button>
    </div>
  )
}

function JsonTool() {
  const [input, setInput] = useState('')
  const result = useMemo(() => formatJson(input), [input])

  return (
    <ToolFrame title="JSON formatter">
      <TextArea label="Input" value={input} onChange={setInput} placeholder='{"hello":"devdeck"}' />
      {result.error && input.trim() && (
        <p className="border-2 border-ink bg-accent-pink px-3 py-2 font-mono text-sm">
          {result.error}
        </p>
      )}
      <TextArea label="Output" value={result.output} readOnly />
      <ResultActions output={result.output} title="Formatted JSON" />
    </ToolFrame>
  )
}

function JwtTool() {
  const [input, setInput] = useState('')
  const result = useMemo(() => decodeJwt(input), [input])
  const output = result.ok
    ? JSON.stringify({ header: result.header, payload: result.payload }, null, 2)
    : ''

  return (
    <ToolFrame title="JWT decoder">
      <TextArea label="Token" value={input} onChange={setInput} placeholder="eyJ..." />
      {result.error && input.trim() && (
        <p className="border-2 border-ink bg-accent-pink px-3 py-2 font-mono text-sm">
          {result.error}
        </p>
      )}
      <TextArea label="Decoded header and payload" value={output} readOnly />
      <ResultActions output={output} title="Decoded JWT" itemType="note" />
    </ToolFrame>
  )
}

function TransformTool({ tool }: { tool: 'base64' | 'url' }) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')

  const output = useMemo(() => {
    if (!input) return ''
    try {
      if (tool === 'base64') return mode === 'encode' ? encodeBase64(input) : decodeBase64(input)
      return mode === 'encode' ? encodeUrl(input) : decodeUrl(input)
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not transform input.'
    }
  }, [input, mode, tool])

  return (
    <ToolFrame title={tool === 'base64' ? 'Base64' : 'URL encoding'}>
      <div className="flex gap-2">
        {(['encode', 'decode'] as const).map((nextMode) => (
          <Button
            key={nextMode}
            type="button"
            size="sm"
            variant={mode === nextMode ? 'accent' : 'secondary'}
            onClick={() => setMode(nextMode)}
          >
            {nextMode}
          </Button>
        ))}
      </div>
      <TextArea label="Input" value={input} onChange={setInput} />
      <TextArea label="Output" value={output} readOnly />
      <ResultActions output={output} title={`${tool.toUpperCase()} ${mode} output`} />
    </ToolFrame>
  )
}

function UuidTool() {
  const [values, setValues] = useState<string[]>(() => [generateUuid()])
  const output = values.join('\n')

  return (
    <ToolFrame title="UUID generator">
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => setValues([generateUuid()])}>
          Generate one
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setValues(Array.from({ length: 10 }, () => generateUuid()))}
        >
          Generate 10
        </Button>
      </div>
      <TextArea label="UUIDs" value={output} readOnly />
      <ResultActions output={output} title="Generated UUIDs" />
    </ToolFrame>
  )
}

function TimestampTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'to-date' | 'to-unix'>('to-date')
  const output = useMemo(() => {
    if (!input.trim()) return ''
    try {
      return mode === 'to-date' ? timestampToDate(input) : dateToUnixTimestamp(input)
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not convert input.'
    }
  }, [input, mode])

  return (
    <ToolFrame title="Timestamp converter">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'to-date' ? 'accent' : 'secondary'}
          onClick={() => setMode('to-date')}
        >
          UNIX to date
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'to-unix' ? 'accent' : 'secondary'}
          onClick={() => setMode('to-unix')}
        >
          Date to UNIX
        </Button>
      </div>
      <TextArea label="Input" value={input} onChange={setInput} placeholder="1716249600" />
      <TextArea label="Output" value={output} readOnly />
      <ResultActions output={output} title="Timestamp conversion" itemType="note" />
    </ToolFrame>
  )
}

function HashTool() {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState<'SHA-1' | 'SHA-256'>('SHA-256')
  const [output, setOutput] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setOutput(await hashText(input, algorithm))
  }

  return (
    <ToolFrame title="Hash generator">
      <form onSubmit={submit} className="grid gap-5">
        <div className="flex gap-2">
          {(['SHA-256', 'SHA-1'] as const).map((nextAlgorithm) => (
            <Button
              key={nextAlgorithm}
              type="button"
              size="sm"
              variant={algorithm === nextAlgorithm ? 'accent' : 'secondary'}
              onClick={() => setAlgorithm(nextAlgorithm)}
            >
              {nextAlgorithm}
            </Button>
          ))}
        </div>
        <TextArea label="Input" value={input} onChange={setInput} />
        <Button type="submit" disabled={!input}>
          Generate hash
        </Button>
      </form>
      <TextArea label="Output" value={output} readOnly />
      <ResultActions output={output} title={`${algorithm} hash`} itemType="note" />
    </ToolFrame>
  )
}

function RegexTool() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('gi')
  const [sample, setSample] = useState('')
  const result = useMemo(() => testRegex(pattern, flags, sample), [flags, pattern, sample])
  const output = result.ok
    ? JSON.stringify({ count: result.matches.length, matches: result.matches }, null, 2)
    : ''

  return (
    <ToolFrame title="Regex tester">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Pattern</span>
          <input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="(dev)(deck)"
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Flags</span>
          <input
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            placeholder="gi"
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
      </div>
      <TextArea label="Sample text" value={sample} onChange={setSample} />
      {result.error && pattern.trim() && (
        <p className="border-2 border-ink bg-accent-pink px-3 py-2 font-mono text-sm">
          {result.error}
        </p>
      )}
      <TextArea label="Matches" value={output} readOnly />
      <ResultActions output={output} title="Regex test matches" itemType="note" />
    </ToolFrame>
  )
}

function SecretScannerTool() {
  const [input, setInput] = useState('')
  const findings = useMemo(() => scanSecrets(input), [input])
  const output = findings.length
    ? JSON.stringify({ count: findings.length, findings }, null, 2)
    : input.trim()
      ? 'No common secret patterns detected.'
      : ''

  return (
    <ToolFrame title="Secret scanner">
      <TextArea
        label="Input"
        value={input}
        onChange={setInput}
        placeholder="Paste .env content, logs, curl commands, stack traces, or snippets before saving/sharing."
      />
      <div className={`border-3 border-ink p-4 ${
        findings.length ? 'bg-accent-pink' : 'bg-accent-lime'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <ShieldAlert size={18} strokeWidth={3} />
          <span className="font-display text-sm font-black uppercase">
            {findings.length ? `${findings.length} finding${findings.length === 1 ? '' : 's'}` : 'No findings'}
          </span>
        </div>
        <p className="mt-2 font-mono text-xs text-ink-soft">
          Runs locally in this session. Values are masked in the report.
        </p>
      </div>
      {findings.length > 0 && (
        <div className="grid gap-2">
          {findings.map((finding, index) => (
            <div key={`${finding.type}-${finding.line}-${finding.column}-${index}`} className="border-2 border-ink bg-bg-elevated p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border-2 border-ink bg-accent-yellow px-2 py-0.5 font-mono text-[10px] uppercase">
                  {finding.severity}
                </span>
                <span className="font-display text-sm font-black uppercase">{finding.type}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-soft">
                line {finding.line}, column {finding.column}: {finding.match}
              </p>
            </div>
          ))}
        </div>
      )}
      <TextArea label="Report" value={output} readOnly />
      <ResultActions output={findings.length ? output : ''} title="Secret scan report" itemType="note" />
    </ToolFrame>
  )
}

function ApiTool() {
  const capture = useCapture()
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('Accept: application/json')
  const [body, setBody] = useState('')
  const [curlImport, setCurlImport] = useState('')
  const [requestHistory, setRequestHistory] = useState<SavedApiRequest[]>(() => readApiRequestHistory())
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{
    status: number
    statusText: string
    durationMs: number
    headers: Record<string, string>
    body: string
  } | null>(null)
  const [error, setError] = useState('')
  const desktopApiTester = typeof window !== 'undefined'
    ? (window as unknown as { electronAPI?: { apiTester?: DesktopApiTesterAPI } }).electronAPI?.apiTester
    : undefined

  const requestConfig = useMemo(
    () => {
      try {
        return serializeRequestConfig({ method, url, headers, body })
      } catch {
        return JSON.stringify({ method, url, headers: headers.split('\n'), body: body || undefined }, null, 2)
      }
    },
    [body, headers, method, url]
  )
  const curlCommand = useMemo(
    () => {
      try {
        return requestConfigToCurl({ method, url, headers, body })
      } catch {
        return ''
      }
    },
    [body, headers, method, url]
  )

  async function sendRequest(event: FormEvent) {
    event.preventDefault()
    setError('')
    setResult(null)
    setIsSending(true)

    try {
      const parsedHeaders = parseHeaders(headers)
      if (desktopApiTester) {
        setResult(await desktopApiTester.send({
          method,
          url,
          headers: parsedHeaders,
          body: method === 'GET' || method === 'HEAD' ? undefined : body || undefined,
        }))
      } else {
        const started = performance.now()
        const response = await fetch(url, {
          method,
          headers: parsedHeaders,
          body: method === 'GET' || method === 'HEAD' ? undefined : body || undefined,
        })
        const responseBody = await response.text()
        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value
        })
        setResult({
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(performance.now() - started),
          headers: responseHeaders,
          body: responseBody,
        })
      }
      rememberCurrentRequest()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Request failed.')
    } finally {
      setIsSending(false)
    }
  }

  async function saveRequest() {
    try {
      await capture.mutateAsync({
        source: 'manual',
        text: requestConfig,
        title_hint: `${method} ${url || 'API request'}`,
        type_hint: 'workflow',
        tags: ['workbench', 'api-request'],
        why_saved: 'Reusable API request saved from DevDeck Workbench.',
      })
      rememberCurrentRequest()
      showToast('Request saved to your vault', 'success')
    } catch {
      showToast('Could not save request', 'error')
    }
  }

  function rememberCurrentRequest() {
    const nextRequest: SavedApiRequest = {
      id: `${method}:${url}:${headers}:${body}`,
      method,
      url,
      headers,
      body,
      updatedAt: new Date().toISOString(),
    }
    setRequestHistory((current) => writeApiRequestHistory(nextRequest, current))
  }

  function loadRequest(request: SavedApiRequest) {
    setMethod(request.method)
    setUrl(request.url)
    setHeaders(request.headers)
    setBody(request.body)
    showToast('Request loaded', 'success')
  }

  function importCurlCommand() {
    try {
      const parsed = parseCurlCommand(curlImport)
      setMethod(parsed.method)
      setUrl(parsed.url)
      setHeaders(parsed.headers || 'Accept: application/json')
      setBody(parsed.body)
      setError('')
      showToast('cURL imported', 'success')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not import cURL.')
    }
  }

  return (
    <ToolFrame title="Quick API tester">
      <form onSubmit={sendRequest} className="grid gap-5">
        {desktopApiTester && (
          <p className="border-2 border-ink bg-accent-lime px-3 py-2 font-mono text-xs">
            Desktop sender enabled. Requests run from the local app process, so browser CORS does not apply.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <label className="grid gap-2">
            <span className="font-display text-xs font-black uppercase tracking-widest">Method</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none"
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((nextMethod) => (
                <option key={nextMethod} value={nextMethod}>
                  {nextMethod}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="font-display text-xs font-black uppercase tracking-widest">URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://api.example.com/health"
              className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
            />
          </label>
        </div>
        <TextArea label="Headers" value={headers} onChange={setHeaders} />
        {method !== 'GET' && method !== 'HEAD' && (
          <TextArea label="Body" value={body} onChange={setBody} placeholder='{"hello":"devdeck"}' />
        )}
        <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
          <TextArea
            label="Import cURL"
            value={curlImport}
            onChange={setCurlImport}
            placeholder="curl -X POST 'https://api.example.com/widgets' -H 'Content-Type: application/json' --data '{...}'"
          />
          <div>
            <Button type="button" variant="secondary" onClick={importCurlCommand} disabled={!curlImport.trim()}>
              Import cURL
            </Button>
          </div>
        </div>
        {error && (
          <p className="border-2 border-ink bg-accent-pink px-3 py-2 font-mono text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!url || isSending}>
            <span className="flex items-center gap-2">
              <Send size={15} strokeWidth={3} />
              {isSending ? 'Sending...' : 'Send request'}
            </span>
          </Button>
          <Button type="button" variant="secondary" onClick={saveRequest} disabled={!url || capture.isPending}>
            <span className="flex items-center gap-2">
              <Save size={15} strokeWidth={3} />
              Save request
            </span>
          </Button>
        </div>
      </form>

      <TextArea label="Saved request config" value={requestConfig} readOnly />
      {curlCommand && (
        <div className="grid gap-3">
          <TextArea label="cURL" value={curlCommand} readOnly />
          <ResultActions output={curlCommand} title={`${method} ${url} cURL`} itemType="note" />
        </div>
      )}
      {requestHistory.length > 0 && (
        <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
          <h3 className="font-display text-sm font-black uppercase tracking-widest">
            Recent requests
          </h3>
          <div className="grid gap-2">
            {requestHistory.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => loadRequest(request)}
                className="flex flex-col gap-1 border-2 border-ink bg-bg-card px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-accent-yellow/20"
              >
                <span className="font-bold">{request.method} {request.url}</span>
                <span className="text-ink-soft">{new Date(request.updatedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
          <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
            <span className="border-2 border-ink bg-accent-lime px-2 py-1 font-bold">
              {result.status} {result.statusText}
            </span>
            <span>{result.durationMs}ms</span>
          </div>
          <TextArea
            label="Response"
            value={[
              JSON.stringify(result.headers, null, 2),
              '',
              result.body,
            ].join('\n')}
            readOnly
          />
          <ResultActions output={result.body} title={`${method} ${url} response`} itemType="note" />
        </div>
      )}
    </ToolFrame>
  )
}

const API_REQUEST_HISTORY_STORAGE_KEY = 'devdeck.workbench.apiRequests.v1'

interface SavedApiRequest {
  id: string
  method: string
  url: string
  headers: string
  body: string
  updatedAt: string
}

function readApiRequestHistory(): SavedApiRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(API_REQUEST_HISTORY_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedApiRequest).slice(0, 8)
  } catch {
    return []
  }
}

function writeApiRequestHistory(
  request: SavedApiRequest,
  currentHistory: SavedApiRequest[]
): SavedApiRequest[] {
  const nextHistory = [
    request,
    ...currentHistory.filter((currentRequest) => currentRequest.id !== request.id),
  ].slice(0, 8)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(API_REQUEST_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory))
    } catch {
      // The in-memory history still works when localStorage is unavailable.
    }
  }

  return nextHistory
}

function isSavedApiRequest(value: unknown): value is SavedApiRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return (
    typeof request.id === 'string' &&
    typeof request.method === 'string' &&
    typeof request.url === 'string' &&
    typeof request.headers === 'string' &&
    typeof request.body === 'string' &&
    typeof request.updatedAt === 'string'
  )
}

const PROJECT_STORAGE_KEY = 'devdeck.workbench.project.v1'

interface DesktopProjectAPI {
  detectCurrent: () => Promise<{
    name: string
    path: string
    gitRemote: string
    gitSlug: string
  }>
}

interface DesktopApiTesterAPI {
  send: (request: {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
  }) => Promise<{
    status: number
    statusText: string
    durationMs: number
    headers: Record<string, string>
    body: string
  }>
}

function ProjectContextTool() {
  const navigate = useNavigate()
  const capture = useCapture()
  const [name, setName] = useState(() => readProjectDraft().name)
  const [remote, setRemote] = useState(() => readProjectDraft().remote)
  const [notes, setNotes] = useState(() => readProjectDraft().notes)
  const [detecting, setDetecting] = useState(false)
  const query = [name.trim(), remoteToSlug(remote)].filter(Boolean).join(' ')
  const projectTag = projectContextTag(name, remote)
  const { data: results = [], isLoading } = useGlobalSearch(query, 'text')
  const desktopProject = typeof window !== 'undefined'
    ? (window as unknown as { electronAPI?: { project?: DesktopProjectAPI } }).electronAPI?.project
    : undefined

  function persist() {
    const next = { name, remote, notes }
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next))
    showToast('Project context saved locally', 'success')
  }

  async function saveProjectNote() {
    const payload = JSON.stringify({ name, remote, notes }, null, 2)
    try {
      await capture.mutateAsync({
        source: 'manual',
        text: payload,
        title_hint: `${name || 'Project'} context`,
        type_hint: 'note',
        tags: ['project-context', name].filter(Boolean),
        why_saved: 'Project context saved from DevDeck Workbench.',
      })
      showToast('Project context saved to your vault', 'success')
    } catch {
      showToast('Could not save project context', 'error')
    }
  }

  async function detectFromDesktop() {
    if (!desktopProject) return
    setDetecting(true)
    try {
      const detected = await desktopProject.detectCurrent()
      setName(detected.name)
      setRemote(detected.gitRemote)
      showToast('Detected current desktop project', 'success')
    } catch {
      showToast('Could not detect project context', 'error')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <ToolFrame title="Project context">
      {desktopProject && (
        <div>
          <Button type="button" variant="secondary" onClick={detectFromDesktop} disabled={detecting}>
            <span className="flex items-center gap-2">
              <FolderGit2 size={15} strokeWidth={3} />
              {detecting ? 'Detecting...' : 'Detect current Desktop project'}
            </span>
          </Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Project name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="dev_deck"
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Git remote</span>
          <input
            value={remote}
            onChange={(event) => setRemote(event.target.value)}
            placeholder="https://github.com/org/repo.git"
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
      </div>
      <TextArea label="Project notes" value={notes} onChange={setNotes} placeholder="Runbooks, local gotchas, useful links..." />
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={persist} disabled={!name && !remote}>
          Save locally
        </Button>
        <Button type="button" onClick={saveProjectNote} disabled={(!name && !remote && !notes) || capture.isPending}>
          Save to vault
        </Button>
      </div>

      <div className="border-3 border-ink bg-bg-elevated p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-black uppercase">Related vault context</h3>
          {isLoading && <span className="font-mono text-xs text-ink-soft">Searching...</span>}
        </div>
        {!query && (
          <p className="font-mono text-sm text-ink-soft">
            Add a project name or remote to search your vault.
          </p>
        )}
        {query && !isLoading && results.length === 0 && (
          <p className="font-mono text-sm text-ink-soft">
            No related items yet. Save a command, request, note, or runbook with this project name.
          </p>
        )}
        <div className="grid gap-2">
          {results.slice(0, 8).map((result) => (
            <ProjectContextResultRow
              key={`${result.type}-${result.id}`}
              result={result}
              projectTag={projectTag}
              onOpen={(target) => {
                if (target.type === 'item') navigate(`/items/${target.id}`)
                else if (target.type === 'repo') navigate(`/repo/${target.id}`)
                else if (target.type === 'cheatsheet') navigate(`/cheatsheets/${target.id}`)
              }}
            />
          ))}
        </div>
      </div>
    </ToolFrame>
  )
}

function ProjectContextResultRow({
  result,
  projectTag,
  onOpen,
}: {
  result: SearchResult
  projectTag: string
  onOpen: (result: SearchResult) => void
}) {
  const { data: item } = useItem(result.type === 'item' ? result.id : undefined)
  const updateItem = useUpdateItem()
  const tags = item?.tags ?? []
  const linked = !!projectTag && tags.includes(projectTag)

  async function copyProjectResult() {
    const value = result.extra || result.title
    await navigator.clipboard.writeText(value)
    showToast('Copied project context item', 'success')
  }

  function openProjectResult() {
    if (result.type === 'entry') {
      void copyProjectResult()
      return
    }
    onOpen(result)
  }

  async function toggleProjectLink() {
    if (!projectTag || result.type !== 'item') return
    const nextTags = linked
      ? tags.filter((tag) => tag !== projectTag)
      : Array.from(new Set([...tags, projectTag]))
    await updateItem.mutateAsync({ id: result.id, input: { tags: nextTags } })
    showToast(linked ? 'Item unlinked from project' : 'Item linked to project', 'success')
  }

  return (
    <div className="border-2 border-ink bg-bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border-2 border-ink bg-accent-yellow px-2 py-0.5 font-mono text-[10px] uppercase">
          {result.type}
        </span>
        {linked && (
          <span className="border-2 border-ink bg-accent-lime px-2 py-0.5 font-mono text-[10px] uppercase">
            linked
          </span>
        )}
        <p className="font-display text-sm font-black uppercase">{result.title}</p>
      </div>
      {result.subtitle && <p className="mt-1 font-mono text-xs text-ink-soft">{result.subtitle}</p>}
      {result.extra && (
        <code className="mt-2 block truncate bg-ink px-2 py-1 font-mono text-[10px] text-bg-primary">
          {result.extra}
        </code>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={openProjectResult}>
          {result.type === 'entry' ? 'Copy command' : 'Open'}
        </Button>
        {result.extra && result.type !== 'entry' && (
          <Button type="button" size="sm" variant="secondary" onClick={copyProjectResult}>
            Copy
          </Button>
        )}
        {result.type === 'item' && (
          <Button
            type="button"
            size="sm"
            variant={linked ? 'secondary' : 'accent'}
            onClick={toggleProjectLink}
            disabled={!projectTag || updateItem.isPending}
          >
            {linked ? 'Unlink project' : 'Link project'}
          </Button>
        )}
      </div>
    </div>
  )
}

const EXPANDER_STORAGE_KEY = 'devdeck.workbench.expander.v1'

interface SnippetAlias {
  alias: string
  expansion: string
}

interface SnippetExpanderConfig {
  enabled: boolean
  paused: boolean
  excludedApps: string
  aliases: SnippetAlias[]
}

function SnippetExpanderTool() {
  const [config, setConfig] = useState<SnippetExpanderConfig>(() => readSnippetExpanderConfig())
  const [alias, setAlias] = useState(':docker-run')
  const [expansion, setExpansion] = useState('docker run --rm -it IMAGE sh')
  const [input, setInput] = useState(':docker-run')
  const [textInput, setTextInput] = useState('Deploy with :docker-run')
  const matchedAlias = config.aliases.find((entry) => entry.alias === input.trim())
  const output = config.enabled && !config.paused && matchedAlias ? matchedAlias.expansion : ''
  const expandedText = config.enabled && !config.paused
    ? expandSnippetAliases(textInput, config.aliases)
    : ''

  function persist(next: SnippetExpanderConfig) {
    setConfig(next)
    writeSnippetExpanderConfig(next)
  }

  function saveAlias() {
    const cleanAlias = alias.trim()
    if (!cleanAlias || !cleanAlias.startsWith(':') || !expansion.trim()) return
    persist({
      ...config,
      aliases: [
        { alias: cleanAlias, expansion },
        ...config.aliases.filter((entry) => entry.alias !== cleanAlias),
      ].slice(0, 25),
    })
    showToast('Alias saved locally', 'success')
  }

  function removeAlias(target: string) {
    persist({ ...config, aliases: config.aliases.filter((entry) => entry.alias !== target) })
  }

  async function copyExpansion() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    showToast('Expansion copied', 'success')
  }

  async function copyExpandedText() {
    if (!expandedText) return
    await navigator.clipboard.writeText(expandedText)
    showToast('Expanded text copied', 'success')
  }

  return (
    <ToolFrame title="Snippet aliases">
      <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
        <label className="flex items-center justify-between gap-3 font-mono text-sm">
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => persist({ ...config, enabled: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 font-mono text-sm">
          <span>Paused</span>
          <input
            type="checkbox"
            checked={config.paused}
            onChange={(event) => persist({ ...config, paused: event.target.checked })}
          />
        </label>
        <TextArea
          label="Excluded apps"
          value={config.excludedApps}
          onChange={(value) => persist({ ...config, excludedApps: value })}
          placeholder={'1Password\nKeychain Access\nTerminal with secrets'}
        />
        <p className="font-mono text-xs text-ink-soft">
          This MVP is local and explicit: no global clipboard history, no silent monitoring, and no sync of typed aliases.
        </p>
      </div>

      <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
          <label className="grid gap-2">
            <span className="font-display text-xs font-black uppercase tracking-widest">Alias</span>
            <input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
            />
          </label>
          <TextArea label="Expansion" value={expansion} onChange={setExpansion} />
        </div>
        <div>
          <Button type="button" onClick={saveAlias} disabled={!alias.trim().startsWith(':') || !expansion.trim()}>
            Save alias locally
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Preview alias</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
        <TextArea
          label="Expansion preview"
          value={output || (config.enabled ? 'No matching alias.' : 'Snippet aliases are disabled.')}
          readOnly
        />
        <div>
          <Button type="button" variant="secondary" onClick={copyExpansion} disabled={!output}>
            Copy expansion
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4">
        <TextArea
          label="Expand text"
          value={textInput}
          onChange={setTextInput}
          placeholder="Use saved aliases inside text, e.g. deploy with :docker-run"
        />
        <TextArea
          label="Expanded text"
          value={expandedText || (config.enabled ? 'No aliases expanded.' : 'Snippet aliases are disabled.')}
          readOnly
        />
        <div>
          <Button type="button" variant="secondary" onClick={copyExpandedText} disabled={!expandedText}>
            Copy expanded text
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {config.aliases.map((entry) => (
          <div key={entry.alias} className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-bg-elevated p-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-black uppercase">{entry.alias}</p>
              <p className="truncate font-mono text-xs text-ink-soft">{entry.expansion}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => removeAlias(entry.alias)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </ToolFrame>
  )
}

function readSnippetExpanderConfig(): SnippetExpanderConfig {
  const fallback: SnippetExpanderConfig = {
    enabled: false,
    paused: false,
    excludedApps: '',
    aliases: [],
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(EXPANDER_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<SnippetExpanderConfig>
    return {
      ...fallback,
      ...parsed,
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases.filter(isSnippetAlias) : [],
    }
  } catch {
    return fallback
  }
}

function writeSnippetExpanderConfig(config: SnippetExpanderConfig) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(EXPANDER_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // In-memory state still works when localStorage is unavailable.
  }
}

function isSnippetAlias(value: unknown): value is SnippetAlias {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return typeof entry.alias === 'string' && typeof entry.expansion === 'string'
}

function expandSnippetAliases(input: string, aliases: SnippetAlias[]): string {
  return aliases.reduce(
    (current, entry) => current.replaceAll(entry.alias, entry.expansion),
    input
  )
}

function readProjectDraft(): { name: string; remote: string; notes: string } {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY)
    if (!raw) return { name: '', remote: '', notes: '' }
    return { name: '', remote: '', notes: '', ...JSON.parse(raw) }
  } catch {
    return { name: '', remote: '', notes: '' }
  }
}

function remoteToSlug(remote: string): string {
  const trimmed = remote.trim().replace(/\.git$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('git@')) return trimmed.split(':').slice(1).join(':')
  try {
    const url = new URL(trimmed)
    return url.pathname.replace(/^\/+/, '')
  } catch {
    return trimmed
  }
}

function projectContextTag(name: string, remote: string): string {
  const source = remoteToSlug(remote) || name.trim()
  const normalized = source
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized ? `project:${normalized}` : ''
}
