import { useState, useMemo } from 'react'
import { Button } from '@devdeck/ui'
import {
  encodeBase64,
  decodeBase64,
  encodeUrl,
  decodeUrl,
} from '../../workbench/utils'
import { ToolFrame, TextArea, ResultActions } from './shared'

export function TransformTool({ tool }: { tool: 'base64' | 'url' }) {
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
