import { useState, type FormEvent } from 'react'
import { Button } from '@devdeck/ui'
import { hashText } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions } from './shared'

export function HashTool() {
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
