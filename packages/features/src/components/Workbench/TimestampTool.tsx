import { useState, useMemo } from 'react'
import { Button } from '@devdeck/ui'
import { timestampToDate, dateToUnixTimestamp } from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions } from './shared'

export function TimestampTool() {
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
