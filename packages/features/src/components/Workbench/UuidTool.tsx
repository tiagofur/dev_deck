import { useState } from 'react'
import { Button } from '@devdeck/ui'
import { generateUuid } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions } from './shared'

export function UuidTool() {
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
