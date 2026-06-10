import { useState, useMemo } from 'react'
import { testRegex } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions, ExampleButton } from './shared'

export function RegexTool() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('gi')
  const [sample, setSample] = useState('')
  const result = useMemo(() => testRegex(pattern, flags, sample), [flags, pattern, sample])
  const output = result.ok
    ? JSON.stringify({ count: result.matches.length, matches: result.matches }, null, 2)
    : ''

  return (
    <ToolFrame title="Regex tester">
      <ExampleButton
        onLoad={() => {
          setPattern('(\\w+)@(\\w+)\\.dev')
          setFlags('gi')
          setSample('Contact ana@devdeck.dev or leo@example.dev for demo access.')
        }}
      />
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
