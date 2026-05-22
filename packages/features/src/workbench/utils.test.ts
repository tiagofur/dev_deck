import { describe, expect, it } from 'vitest'
import {
  dateToUnixTimestamp,
  decodeJwt,
  formatJson,
  parseHeaders,
  parseCurlCommand,
  requestConfigToCurl,
  scanSecrets,
  serializeRequestConfig,
  testRegex,
  timestampToDate,
} from './utils'

describe('workbench utils', () => {
  it('formats valid JSON', () => {
    expect(formatJson('{"name":"DevDeck"}')).toEqual({
      ok: true,
      output: '{\n  "name": "DevDeck"\n}',
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
      'eyJzdWIiOiIxMjMiLCJuYW1lIjoiRGV2RGVjayJ9',
      '',
    ].join('.')

    expect(decodeJwt(token)).toEqual({
      ok: true,
      header: { alg: 'none', typ: 'JWT' },
      payload: { sub: '123', name: 'DevDeck' },
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
        headers: "Content-Type: application/json\nX-Name: DevDeck's test",
        body: '{"ok":true}',
      })
    ).toBe(
      [
        'curl -X POST',
        "'https://example.test/widgets'",
        "-H 'Content-Type: application/json'",
        "-H 'X-Name: DevDeck'\\''s test'",
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
          '--data \'{"name":"DevDeck"}\'',
        ].join(' \\\n  ')
      )
    ).toEqual({
      method: 'PATCH',
      url: 'https://example.test/widgets/1',
      headers: 'Content-Type: application/json\nX-Test: yes',
      body: '{"name":"DevDeck"}',
    })
  })

  it('tests regular expressions and captures groups', () => {
    expect(testRegex('(dev)(deck)', 'i', 'DevDeck devdeck')).toEqual({
      ok: true,
      matches: [
        { match: 'DevDeck', index: 0, groups: ['Dev', 'Deck'] },
        { match: 'devdeck', index: 8, groups: ['dev', 'deck'] },
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
