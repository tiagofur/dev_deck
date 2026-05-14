// Client-side mirror of internal/domain/items/detect.go.
//
// The backend is the source of truth for final type detection — this
// helper exists so the paste interceptor and capture modal can show a
// reasonable preview BEFORE the POST round-trip. If the two disagree,
// the server wins and the client just updates its local copy of the
// item returned by the API.
//
// Keeping the two implementations in sync is manual for now; the test
// suite under detect.test.ts mirrors the backend's 9-rule matrix so
// drift shows up in CI.

import type { CaptureInput, ItemType } from './types'

export interface DetectionResult {
  type: ItemType
  title: string
}

/**
 * Run the 9-rule heuristic classifier. Order matters — earlier rules
 * win over later ones so explicit hints beat URL heuristics beats text
 * heuristics.
 */
export function detectType(input: CaptureInput): DetectionResult {
  // Rule 1 — explicit type_hint wins.
  if (input.type_hint) {
    return { type: input.type_hint, title: deriveTitle(input, input.type_hint) }
  }

  const rawUrl = (input.url ?? '').trim()
  const rawText = (input.text ?? '').trim()

  if (rawUrl) {
    const u = safeParseURL(rawUrl)
    if (u) {
      const host = u.hostname.toLowerCase().replace(/^www\./, '')

      // Rule 2 — github.com/<owner>/<repo>.
      if (host === 'github.com') {
        const parts = githubOwnerRepo(u.pathname)
        if (parts) {
          return { type: 'repo', title: `${parts.owner}/${parts.repo}` }
        }
      }

      // Rule 3 — plugin marketplaces.
      if (PLUGIN_HOSTS.has(host)) {
        return { type: 'plugin', title: deriveTitleFromURL(u) }
      }

      // Rule 4 — known article domains.
      if (isArticleHost(host)) {
        return { type: 'article', title: deriveTitleFromURL(u) }
      }
    }
  }

  if (rawText) {
    // Rule 5 — shell command prefix.
    if (isCommandText(rawText)) {
      return { type: 'cli', title: firstLine(rawText) }
    }
    // Rule 6 — snippet (triple backticks or multi-line code).
    if (isSnippetText(rawText)) {
      return { type: 'snippet', title: firstLine(rawText) }
    }
    // Rule 7 — keyboard shortcut.
    if (isShortcutText(rawText)) {
      return { type: 'shortcut', title: rawText }
    }
  }

  // Rule 8 — url present but no more specific match.
  if (rawUrl) {
    const u = safeParseURL(rawUrl)
    if (u) {
      return { type: 'tool', title: deriveTitleFromURL(u) }
    }
  }

  // Rule 9 — fallback: plain note.
  const title = input.title_hint?.trim() || firstLine(rawText)
  return { type: 'note', title }
}

/**
 * quickDetectFromClipboard is what the paste interceptor calls.
 * It treats the whole clipboard string as either a URL (if it parses
 * as one) or plain text, then runs the standard detector.
 */
export function quickDetectFromClipboard(raw: string): DetectionResult {
  const trimmed = raw.trim()
  if (!trimmed) return { type: 'note', title: '' }
  if (looksLikePotentialURL(trimmed)) {
    return detectType({ url: normalizeURLInput(trimmed) })
  }
  return detectType({ text: trimmed })
}

// ─── helpers ───

function safeParseURL(raw: string): URL | null {
  try {
    const u = new URL(raw)
    if (!u.hostname) return null
    return u
  } catch {
    return null
  }
}

/**
 * looksLikeURL accepts strings that `new URL(...)` would parse AND that
 * start with http(s):// — so "foo.com" without a scheme still becomes a
 * text note, matching the backend's behaviour (which requires a parsable
 * URL with a host).
 */
export function looksLikeURL(s: string): boolean {
  if (!/^https?:\/\//i.test(s)) return false
  return safeParseURL(s) !== null
}

/**
 * Accepts full http(s) URLs and bare host/path strings like
 * "github.com/owner/repo". Used by capture UIs so users don't have to
 * type a scheme for common paste/save flows.
 */
export function looksLikePotentialURL(s: string): boolean {
  const trimmed = s.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  if (looksLikeURL(trimmed)) return true
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)
}

export function normalizeURLInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (looksLikeURL(trimmed)) return trimmed
  if (looksLikePotentialURL(trimmed)) return `https://${trimmed}`
  return trimmed
}

export function parseCaptureTags(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const tag = normalizeTag(part)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

export function suggestCaptureTags(input: {
  type: ItemType
  url?: string
  text?: string
}): string[] {
  const tags = new Set<string>([input.type])
  const host = input.url ? safeHost(normalizeURLInput(input.url)) : ''
  const lowerText = (input.text ?? '').toLowerCase()

  if (host.includes('github.com')) tags.add('github')
  if (host.includes('dev.to') || host.includes('medium.com') || host.includes('hashnode')) tags.add('article')
  if (input.type === 'cli' || isTerminalText(lowerText)) tags.add('terminal')
  if (input.type === 'snippet') tags.add('code')
  if (input.type === 'shortcut') tags.add('shortcut')
  if (input.type === 'prompt' || input.type === 'agent') tags.add('ai')

  if (/\b(go|golang)\b/.test(lowerText) || host.includes('go.dev')) tags.add('go')
  if (/\b(npm|pnpm|yarn|node|typescript|react)\b/.test(lowerText)) tags.add('node')
  if (/\b(python|pip|pipx)\b/.test(lowerText)) tags.add('python')
  if (/\b(rust|cargo)\b/.test(lowerText)) tags.add('rust')
  if (/\b(docker|compose)\b/.test(lowerText)) tags.add('docker')
  if (/\b(kubectl|kubernetes|k8s)\b/.test(lowerText)) tags.add('kubernetes')

  return [...tags].map(normalizeTag).filter(Boolean).slice(0, 5)
}

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

const RESERVED_GITHUB_FIRST_SEGMENTS = new Set([
  'search',
  'settings',
  'marketplace',
  'explore',
  'trending',
  'notifications',
  'pulls',
  'issues',
  'topics',
  'about',
  'login',
  'join',
  'organizations',
])

function githubOwnerRepo(path: string): { owner: string; repo: string } | null {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) return null
  if (RESERVED_GITHUB_FIRST_SEGMENTS.has(parts[0].toLowerCase())) return null
  const repo = parts[1].replace(/\.git$/, '')
  return { owner: parts[0], repo }
}

const PLUGIN_HOSTS = new Set([
  'marketplace.visualstudio.com',
  'plugins.jetbrains.com',
  'addons.mozilla.org',
  'chromewebstore.google.com',
  'chrome.google.com',
])

const ARTICLE_HOSTS = new Set([
  'dev.to',
  'medium.com',
  'hashnode.com',
  'hashnode.dev',
  'substack.com',
  'blog.logrocket.com',
  'css-tricks.com',
  'smashingmagazine.com',
  'freecodecamp.org',
])

function isArticleHost(host: string): boolean {
  if (ARTICLE_HOSTS.has(host)) return true
  for (const base of ARTICLE_HOSTS) {
    if (host.endsWith(`.${base}`)) return true
  }
  return false
}

const COMMAND_PREFIXES = [
  '$ ',
  '> ',
  'brew install',
  'brew tap',
  'apt install',
  'apt-get install',
  'npm install -g',
  'npm i -g',
  'pnpm add -g',
  'yarn global add',
  'cargo install',
  'go install',
  'pip install',
  'pipx install',
  'gem install',
  'curl ',
  'wget ',
  'docker run',
  'docker pull',
  'kubectl ',
]

function isCommandText(text: string): boolean {
  const lower = text.toLowerCase()
  return COMMAND_PREFIXES.some((p) => lower.startsWith(p))
}

function isTerminalText(text: string): boolean {
  return /^(brew|npm|pnpm|yarn|cargo|go|pip|pipx|docker|kubectl|curl|wget)\b/.test(text)
}

function safeHost(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isSnippetText(text: string): boolean {
  if (text.includes('```')) return true
  const lines = text.split('\n')
  if (lines.length < 3) return false
  let codeish = 0
  for (const l of lines) {
    const trimmed = l.trim()
    if (!trimmed) continue
    if (l.startsWith('  ') || l.startsWith('\t')) {
      codeish++
      continue
    }
    if (/[{};,]$/.test(trimmed)) {
      codeish++
      continue
    }
    if (/\b(function|def|const|let|var)\b/.test(trimmed) || trimmed.includes('=>')) {
      codeish++
    }
  }
  return codeish >= 2
}

const SHORTCUT_RE =
  /^(cmd|ctrl|alt|opt|option|shift|meta|win)([+\- ](cmd|ctrl|alt|opt|option|shift|meta|win))*[+\- ]([a-z0-9]|f\d{1,2}|esc|tab|enter|space|up|down|left|right)$/i

function isShortcutText(text: string): boolean {
  return SHORTCUT_RE.test(text.trim())
}

function firstLine(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  const nl = trimmed.indexOf('\n')
  return nl === -1 ? trimmed : trimmed.slice(0, nl).trim()
}

function deriveTitleFromURL(u: URL): string {
  const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const s = parts[i].trim()
    if (s) return s
  }
  return u.hostname.replace(/^www\./, '')
}

function deriveTitle(input: CaptureInput, type: ItemType): string {
  if (input.title_hint) return input.title_hint
  if (input.url) {
    const u = safeParseURL(input.url)
    if (u) {
      if (type === 'repo') {
        const parts = githubOwnerRepo(u.pathname)
        if (parts) return `${parts.owner}/${parts.repo}`
      }
      return deriveTitleFromURL(u)
    }
  }
  return firstLine(input.text ?? '')
}
