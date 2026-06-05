#!/usr/bin/env node
import { createRequire } from 'node:module'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const desktopRequire = createRequire(join(root, 'apps/desktop/package.json'))
const { chromium } = desktopRequire('@playwright/test')

const baseUrl = process.env.DEVDECK_WEB_URL || 'http://127.0.0.1:5173'
const outDir = join(root, 'docs/assets/launch')
mkdirSync(outDir, { recursive: true })

const now = '2026-06-04T18:00:00.000Z'

const demoUser = {
  id: 'demo-user',
  login: 'devdeck-demo',
  username: 'devdeck-demo',
  display_name: 'DevDeck Demo',
  avatar_url: '',
  role: 'user',
  plan: 'public-beta',
  region: 'local',
  onboarding_completed: true,
  created_at: '2026-05-01T12:00:00.000Z',
  stack_tags: ['typescript', 'go', 'react', 'ai-tools'],
  website: 'https://devdeck.ai',
  location: 'Remote',
  github_url: 'https://github.com/tiagofur/dev_deck',
}

function item(input) {
  return {
    id: input.id,
    user_id: 'demo-user',
    item_type: input.item_type,
    title: input.title,
    url: input.url || '',
    url_normalized: input.url || '',
    description: input.description || '',
    notes: input.notes || '',
    tags: input.tags || [],
    why_saved: input.why_saved || '',
    when_to_use: input.when_to_use || '',
    source_channel: input.source_channel || 'launch-demo',
    meta: input.meta || {},
    ai_summary: input.ai_summary || input.description || '',
    ai_tags: input.ai_tags || [],
    enrichment_status: input.enrichment_status || 'ok',
    archived: false,
    is_favorite: Boolean(input.is_favorite),
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    last_seen_at: input.last_seen_at || now,
  }
}

const demoItems = [
  item({
    id: 'repo-tanstack-query',
    item_type: 'repo',
    title: 'TanStack Query offline mutation patterns',
    url: 'https://github.com/TanStack/query',
    description: 'Practical patterns for resilient data fetching, retries, and mutation queues.',
    tags: ['react', 'offline-first', 'team-review'],
    why_saved: 'Useful when we need frontend state that survives flaky networks.',
    when_to_use: 'Before implementing sync-heavy React features.',
    source_channel: 'GitHub',
    is_favorite: true,
    meta: { stars: 43000, language: 'TypeScript', language_color: '#3178c6', topics: ['react-query', 'cache'] },
  }),
  item({
    id: 'cli-gh-pr-review',
    item_type: 'cli',
    title: 'gh pr review workflow aliases',
    description: 'Short commands for checking review threads, CI state, and ready-to-merge status.',
    tags: ['github', 'cli', 'reviews'],
    why_saved: 'Keeps small PRs moving without losing issue-first discipline.',
    when_to_use: 'During launch-readiness review loops.',
    source_channel: 'terminal-notes',
    meta: { language: 'Shell', language_color: '#89e051' },
  }),
  item({
    id: 'snippet-caddy-vps',
    item_type: 'snippet',
    title: 'Caddy reverse proxy block for self-hosting',
    description: 'Minimal Caddyfile pattern for routing the web app and API behind TLS.',
    tags: ['self-hosting', 'caddy', 'vps'],
    why_saved: 'Good starting point for public beta deploy docs.',
    when_to_use: 'When validating the self-hosting quickstart.',
    source_channel: 'ops-runbook',
    meta: { language: 'Caddyfile', language_color: '#22c55e' },
  }),
  item({
    id: 'prompt-review-risk',
    item_type: 'prompt',
    title: 'Review PR risk before merge',
    description: 'A compact checklist for test coverage, rollback risk, issue scope, and user-facing copy.',
    tags: ['prompt', 'code-review', 'quality'],
    why_saved: 'Prevents big unreviewable PRs from sneaking into launch work.',
    when_to_use: 'Before marking a draft PR ready.',
    source_channel: 'team-circle',
    meta: { language: 'Markdown', language_color: '#083fa1' },
  }),
]

const circleItems = demoItems.slice(0, 3).map((it, index) => ({
  ...it,
  meta: {
    ...it.meta,
    circle_share_context: [
      'This saved us from building a custom cache layer before validating the sync boundary.',
      'Use this alias set when checking small issue-backed PRs during launch week.',
      'Good self-hosting reference for contributors testing the beta on a cheap VPS.',
    ][index],
    circle_shared_by_name: ['Maya Chen', 'Tiago Furquim', 'Ana Souza'][index],
    circle_shared_by_username: ['maya-dev', 'tiagofur', 'anasouza'][index],
    circle_shared_at: now,
  },
}))

const circles = [
  {
    id: 'circle-launch-guild',
    name: 'Launch Guild',
    description: 'A private Circle for polishing DevDeck public beta assets, docs, and daily workflows.',
    invite_code: 'LAUNCH50',
    created_by: 'demo-user',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'circle-ai-builders',
    name: 'AI Builders Circle',
    description: 'Shared findings for AI tooling, local-first workflows, and useful developer automations.',
    invite_code: 'AIBUILD',
    created_by: 'demo-user',
    created_at: now,
    updated_at: now,
  },
]

const members = [
  { user_id: 'demo-user', username: 'devdeck-demo', display_name: 'DevDeck Demo', avatar_url: '', role: 'owner' },
  { user_id: 'maya', username: 'maya-dev', display_name: 'Maya Chen', avatar_url: '', role: 'member' },
  { user_id: 'ana', username: 'anasouza', display_name: 'Ana Souza', avatar_url: '', role: 'member' },
]

const stats = {
  total_items: demoItems.length,
  saved_this_week: 7,
  active_streak_days: 5,
  enrichment_queue: 0,
  favorite_count: 1,
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function installDemoApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('devdeck_access_token', 'launch-demo-token')
    localStorage.setItem('devdeck_refresh_token', 'launch-demo-refresh')
    localStorage.setItem('devdeck.prefs.v1', JSON.stringify({ theme: 'system' }))
  })

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const rawPath = url.pathname
    const apiIndex = rawPath.indexOf('/api/')
    const path = apiIndex >= 0 ? rawPath.slice(apiIndex) : rawPath
    const method = route.request().method()

    if (path === '/api/auth/me') return fulfillJson(route, demoUser)
    if (path === '/api/stats') return fulfillJson(route, stats)
    if (path === '/api/items/tags') return fulfillJson(route, ['react', 'github', 'self-hosting', 'code-review'])
    if (path === '/api/items' && method === 'GET') return fulfillJson(route, { total: demoItems.length, items: demoItems })
    if (path.startsWith('/api/items/') && path.endsWith('/related')) return fulfillJson(route, { items: demoItems.slice(1), total: 2 })
    if (path.startsWith('/api/items/')) {
      const id = path.split('/')[3]
      return fulfillJson(route, demoItems.find((it) => it.id === id) || demoItems[0])
    }
    if (path === '/api/circles') return fulfillJson(route, circles)
    if (path === '/api/circles/circle-launch-guild') return fulfillJson(route, circles[0])
    if (path === '/api/circles/circle-launch-guild/items') return fulfillJson(route, circleItems)
    if (path === '/api/circles/circle-launch-guild/members') return fulfillJson(route, members)
    if (path.startsWith('/api/circles/') && path.endsWith('/items')) return fulfillJson(route, circleItems)
    if (path.startsWith('/api/circles/') && path.endsWith('/members')) return fulfillJson(route, members)
    if (path.startsWith('/api/circles/')) return fulfillJson(route, circles[0])
    if (path === '/api/repos') return fulfillJson(route, { total: 0, repos: [] })
    if (path === '/api/feed/following') return fulfillJson(route, { events: [] })
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') return fulfillJson(route, {})
    return fulfillJson(route, {})
  })
}

async function capture(page, path, fileName, waitForText) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  if (waitForText) await page.getByText(waitForText, { exact: false }).first().waitFor({ timeout: 10_000 })
  await page.screenshot({ path: join(outDir, fileName), fullPage: true })
  console.log(`Captured ${fileName}`)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await installDemoApi(page)

try {
  await capture(page, '/', 'devdeck-vault.png', 'TanStack Query')
  await capture(page, '/workbench?tool=json', 'devdeck-workbench.png', 'Developer Workbench')
  await capture(page, '/circles', 'devdeck-circles.png', 'Launch Guild')
  await capture(page, '/circles/circle-launch-guild', 'devdeck-circle-detail.png', 'Shared Vault')
} finally {
  await browser.close()
}

if (!existsSync(join(outDir, 'devdeck-vault.png'))) throw new Error('Screenshot capture failed')
