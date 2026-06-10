import { useState, useMemo } from 'react'
import { decodeJwt } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions, ExampleButton } from './shared'

export function JwtTool() {
  const [input, setInput] = useState('')
  const result = useMemo(() => decodeJwt(input), [input])
  const output = result.ok
    ? JSON.stringify({ header: result.header, payload: result.payload }, null, 2)
    : ''

  return (
    <ToolFrame title="JWT decoder">
      <ExampleButton
        onLoad={() =>
          setInput(
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
          )
        }
      />
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
