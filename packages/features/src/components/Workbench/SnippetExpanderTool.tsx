import { useState } from 'react'
import { Button, showToast } from '@devdeck/ui'
import { ToolFrame, TextArea } from './shared'

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

export function SnippetExpanderTool() {
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
