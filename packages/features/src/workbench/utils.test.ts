import { describe, expect, it } from 'vitest'
import {
  dateToUnixTimestamp,
  decodeJwt,
  formatJson,
  parseHeaders,
  parseCurlCommand,
  redactSensitiveHeaders,
  requestConfigToCurl,
  scanSecrets,
  serializeRequestConfig,
  testRegex,
  timestampToDate,
} from './utils'

describe('workbench utils', () => {
  it('formats valid JSON', () => {
    expect(formatJson('{"name":"HeapDeck"}')).toEqual({
      ok: true,
      output: '{\n  "name": "HeapDeck"\n}',
    })
  })

  it('returns a clear JSON parse error', () => {
    const result = formatJson('{nope')
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('decodes JWT header and payload locally', () => {
    const token = [
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
      'eyJzdWIiOiIxMjMiLCJuYW1lIjoiSGVhcERlY2sifQ',
      '',
    ].join('.')

    expect(decodeJwt(token)).toEqual({
      ok: true,
      header: { alg: 'none', typ: 'JWT' },
      payload: { sub: '123', name: 'HeapDeck' },
    })
  })

  it('converts unix timestamps and dates', () => {
    expect(timestampToDate('0')).toBe('1970-01-01T00:00:00.000Z')
    expect(dateToUnixTimestamp('1970-01-01T00:00:01.000Z')).toBe('1')
  })

  it('parses HTTP headers', () => {
    expect(parseHeaders('Accept: application/json\nX-Test: yes')).toEqual({
      Accept: 'application/json',
      'X-Test': 'yes',
    })
  })

  it('serializes request configs as reusable JSON', () => {
    expect(
      serializeRequestConfig({
        method: 'POST',
        url: 'https://example.test',
        headers: 'Content-Type: application/json',
        body: '{"ok":true}',
      })
    ).toContain('"method": "POST"')
  })

  it('converts request configs to reusable curl commands', () => {
    expect(
      requestConfigToCurl({
        method: 'POST',
        url: 'https://example.test/widgets',
        headers: "Content-Type: application/json\nX-Name: HeapDeck's test",
        body: '{"ok":true}',
      })
    ).toBe(
      [
        'curl -X POST',
        "'https://example.test/widgets'",
        "-H 'Content-Type: application/json'",
        "-H 'X-Name: HeapDeck'\\''s test'",
        '--data \'{"ok":true}\'',
      ].join(' \\\n  ')
    )
  })

  it('parses reusable curl commands into request configs', () => {
    expect(
      parseCurlCommand(
        [
          'curl -X PATCH',
          "'https://example.test/widgets/1'",
          "-H 'Content-Type: application/json'",
          "-H 'X-Test: yes'",
          '--data \'{"name":"HeapDeck"}\'',
        ].join(' \\\n  ')
      )
    ).toEqual({
      method: 'PATCH',
      url: 'https://example.test/widgets/1',
      headers: 'Content-Type: application/json\nX-Test: yes',
      body: '{"name":"HeapDeck"}',
    })
  })

  it('tests regular expressions and captures groups', () => {
    expect(testRegex('(heap)(deck)', 'i', 'HeapDeck heapdeck')).toEqual({
      ok: true,
      matches: [
        { match: 'HeapDeck', index: 0, groups: ['Heap', 'Deck'] },
        { match: 'heapdeck', index: 9, groups: ['heap', 'deck'] },
      ],
    })
  })

  it('detects and masks likely secrets locally', () => {
    expect(
      scanSecrets(
        [
          'OPENAI_API_KEY=sk-testabcdefghijklmnopqrstuvwxyz',
          'GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456',
          'PASSWORD=supersecretvalue',
        ].join('\n')
      )
    ).toEqual([
      {
        type: 'OpenAI API key',
        severity: 'high',
        line: 1,
        column: 16,
        match: 'sk-tes...wxyz',
      },
      {
        type: 'GitHub token',
        severity: 'high',
        line: 2,
        column: 14,
        match: 'ghp_ab...3456',
      },
      {
        type: 'Likely secret assignment',
        severity: 'medium',
        line: 3,
        column: 1,
        match: 'PASSWO...alue',
      },
    ])
  })
})

describe('redactSensitiveHeaders', () => {
  it('strips auth-bearing headers before local persistence', () => {
    expect(
      redactSensitiveHeaders(
        ['Accept: application/json', 'Authorization: Bearer super-secret', 'X-Api-Key: abc123', 'Content-Type: application/json'].join('\n'),
      ),
    ).toBe(['Accept: application/json', 'Content-Type: application/json'].join('\n'))
  })

  it('matches credential keywords case-insensitively and keeps ordinary headers', () => {
    expect(
      redactSensitiveHeaders(
        ['X-Auth-Token: keep-me-out', 'x-api-key: nope', 'X-Forwarded-For: 1.2.3.4', 'Accept-Language: es'].join('\n'),
      ),
    ).toBe(['X-Forwarded-For: 1.2.3.4', 'Accept-Language: es'].join('\n'))
  })

  it('keeps lines that are not headers', () => {
    expect(redactSensitiveHeaders('just a note\nAuthorization: Bearer x')).toBe('just a note')
  })
})
