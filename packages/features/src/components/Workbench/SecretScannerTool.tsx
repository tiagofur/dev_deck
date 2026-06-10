import { useState, useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'
import { scanSecrets } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions, ExampleButton } from './shared'

export function SecretScannerTool() {
  const [input, setInput] = useState('')
  const findings = useMemo(() => scanSecrets(input), [input])
  const output = findings.length
    ? JSON.stringify({ count: findings.length, findings }, null, 2)
    : input.trim()
      ? 'No common secret patterns detected.'
      : ''

  return (
    <ToolFrame title="Secret scanner">
      <ExampleButton
        onLoad={() =>
          setInput(
            [
              '# demo .env — every value here is fake',
              'API_URL=https://api.example.dev',
              'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
              'GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz12',
              'DB_PASSWORD=correct-horse-battery-staple',
            ].join('\n')
          )
        }
      />
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
