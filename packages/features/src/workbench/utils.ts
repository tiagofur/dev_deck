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
