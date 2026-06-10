import { useState, useMemo, type FormEvent } from 'react'
import { Send, Save } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useCapture } from '@devdeck/api-client'
import {
  parseHeaders,
  serializeRequestConfig,
  requestConfigToCurl,
  parseCurlCommand,
} from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions, ExampleButton } from './shared'

const API_REQUEST_HISTORY_STORAGE_KEY = 'devdeck.workbench.apiRequests.v1'

interface SavedApiRequest {
  id: string
  method: string
  url: string
  headers: string
  body: string
  updatedAt: string
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

export function ApiTool() {
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
          <ExampleButton
            onLoad={() =>
              setCurlImport(
                "curl -X GET 'https://api.github.com/repos/golang/go' -H 'Accept: application/vnd.github+json'"
              )
            }
          />
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
