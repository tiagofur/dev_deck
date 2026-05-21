import { describe, expect, it } from 'vitest'
import {
  dateToUnixTimestamp,
  decodeJwt,
  formatJson,
  parseHeaders,
  serializeRequestConfig,
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
})
