export interface JsonFormatResult {
  ok: boolean
  output: string
  error?: string
}

export function formatJson(input: string, spacing = 2): JsonFormatResult {
  if (!input.trim()) return { ok: false, output: '', error: 'Paste JSON to format it.' }

  try {
    return {
      ok: true,
      output: JSON.stringify(JSON.parse(input), null, spacing),
    }
  } catch (error) {
    return {
      ok: false,
      output: '',
      error: error instanceof Error ? error.message : 'Invalid JSON.',
    }
  }
}

export interface JwtDecodeResult {
  ok: boolean
  header?: unknown
  payload?: unknown
  error?: string
}

export function decodeJwt(token: string): JwtDecodeResult {
  const parts = token.trim().split('.')
  if (parts.length < 2) return { ok: false, error: 'JWT must include header and payload.' }

  try {
    return {
      ok: true,
      header: JSON.parse(decodeBase64Url(parts[0])),
      payload: JSON.parse(decodeBase64Url(parts[1])),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JWT.',
    }
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  )
}

export function encodeBase64(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
}

export function decodeBase64(input: string): string {
  return decodeURIComponent(escape(atob(input.trim())))
}

export function encodeUrl(input: string): string {
  return encodeURIComponent(input)
}

export function decodeUrl(input: string): string {
  return decodeURIComponent(input)
}

export function generateUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function timestampToDate(input: string): string {
  const parsed = Number(input.trim())
  if (!Number.isFinite(parsed)) throw new Error('Timestamp must be a number.')
  const millis = parsed < 10_000_000_000 ? parsed * 1000 : parsed
  return new Date(millis).toISOString()
}

export function dateToUnixTimestamp(input: string): string {
  const millis = Date.parse(input.trim())
  if (!Number.isFinite(millis)) throw new Error('Date must be parseable.')
  return String(Math.floor(millis / 1000))
}

export async function hashText(input: string, algorithm: 'SHA-1' | 'SHA-256'): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(algorithm, new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export interface RegexMatch {
  match: string
  index: number
  groups: string[]
}

export interface RegexTestResult {
  ok: boolean
  matches: RegexMatch[]
  error?: string
}

export function testRegex(pattern: string, flags: string, sample: string): RegexTestResult {
  if (!pattern.trim()) return { ok: false, matches: [], error: 'Enter a regular expression.' }

  try {
    const safeFlags = flags.includes('g') ? flags : `${flags}g`
    const regex = new RegExp(pattern, safeFlags)
    const matches = Array.from(sample.matchAll(regex)).map((match) => ({
      match: match[0],
      index: match.index ?? 0,
      groups: match.slice(1),
    }))
    return { ok: true, matches }
  } catch (error) {
    return {
      ok: false,
      matches: [],
      error: error instanceof Error ? error.message : 'Invalid regular expression.',
    }
  }
}

export function parseHeaders(input: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator <= 0) throw new Error(`Invalid header: ${line}`)
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  return headers
}

export function serializeRequestConfig(input: {
  method: string
  url: string
  headers: string
  body: string
}): string {
  return JSON.stringify(
    {
      method: input.method,
      url: input.url,
      headers: parseHeaders(input.headers),
      body: input.body || undefined,
    },
    null,
    2
  )
}

export function requestConfigToCurl(input: {
  method: string
  url: string
  headers: string
  body: string
}): string {
  const parts = [`curl -X ${input.method}`, shellQuote(input.url)]
  const parsedHeaders = parseHeaders(input.headers)

  for (const [key, value] of Object.entries(parsedHeaders)) {
    parts.push(`-H ${shellQuote(`${key}: ${value}`)}`)
  }

  if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
    parts.push(`--data ${shellQuote(input.body)}`)
  }

  return parts.join(' \\\n  ')
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export interface ParsedCurlRequest {
  method: string
  url: string
  headers: string
  body: string
}

export function parseCurlCommand(input: string): ParsedCurlRequest {
  const tokens = tokenizeShell(input.replace(/\\\r?\n/g, ' '))
  if (tokens[0] !== 'curl') throw new Error('Command must start with curl.')

  let method = 'GET'
  let url = ''
  const headerLines: string[] = []
  const bodyParts: string[] = []

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]

    if (token === '-X' || token === '--request') {
      if (!next) throw new Error(`${token} requires a method.`)
      method = next.toUpperCase()
      index += 1
      continue
    }

    if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase()
      continue
    }

    if (token === '-H' || token === '--header') {
      if (!next) throw new Error(`${token} requires a header.`)
      headerLines.push(next)
      index += 1
      continue
    }

    if (token.startsWith('-H') && token.length > 2) {
      headerLines.push(token.slice(2))
      continue
    }

    if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      if (!next) throw new Error(`${token} requires a body.`)
      bodyParts.push(next)
      if (method === 'GET') method = 'POST'
      index += 1
      continue
    }

    if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token
    }
  }

  if (!url) throw new Error('Could not find an http(s) URL in the curl command.')

  return {
    method,
    url,
    headers: headerLines.join('\n'),
    body: bodyParts.join('&'),
  }
}

function tokenizeShell(input: string): string[] {
  const tokens: string[] = []
  let token = ''
  let quote: '"' | "'" | null = null

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (quote) {
      if (char === quote) {
        quote = null
      } else if (char === '\\' && quote === '"' && index + 1 < input.length) {
        index += 1
        token += input[index]
      } else {
        token += char
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (token) {
        tokens.push(token)
        token = ''
      }
      continue
    }

    if (char === '\\' && index + 1 < input.length) {
      index += 1
      token += input[index]
      continue
    }

    token += char
  }

  if (quote) throw new Error('Unclosed quote in curl command.')
  if (token) tokens.push(token)
  return tokens
}
