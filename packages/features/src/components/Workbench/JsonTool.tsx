import { useState, useMemo } from 'react'
import { formatJson } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions, ExampleButton } from './shared'

export function JsonTool() {
  const [input, setInput] = useState('')
  const result = useMemo(() => formatJson(input), [input])

  return (
    <ToolFrame title="JSON formatter">
      <ExampleButton
        onLoad={() =>
          setInput('{ "name":"devdeck","tags":["cli","vault"], "stars": 1234,"nested":{"ok":true,"version":"0.5.0"}}')
        }
      />
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
