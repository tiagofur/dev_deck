// Zero-dependency test for src/lib/storage.js. We stub the chrome.*
// global with an in-memory shim so the module can be imported in plain
// node with `node tests/storage.test.js`.
//
// This runs from the CI cli/extension job — see .github/workflows/ci.yml.

import assert from 'node:assert/strict'
import { test } from 'node:test'

// Shim chrome.storage.local BEFORE importing the module under test
// so its top-level imports pick up the fake.
const storage = new Map()
globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        const out = {}
        const list = Array.isArray(keys) ? keys : [keys]
        for (const k of list) {
          if (storage.has(k)) out[k] = storage.get(k)
        }
        return out
      },
      async set(patch) {
        for (const [k, v] of Object.entries(patch)) {
          storage.set(k, v)
        }
      },
      async remove(keys) {
        const list = Array.isArray(keys) ? keys : [keys]
        for (const k of list) storage.delete(k)
      },
    },
  },
}

const mod = await import('../src/lib/storage.js')

test('getSettings returns defaults when empty', async () => {
  storage.clear()
  const s = await mod.getSettings()
  assert.equal(s.apiUrl, 'http://localhost:8080')
  assert.equal(s.token, '')
})

test('setSettings + getSettings round-trip', async () => {
  storage.clear()
  await mod.setSettings({ apiUrl: 'https://api.devdeck.ai', token: 'sk_123' })
  const s = await mod.getSettings()
  assert.equal(s.apiUrl, 'https://api.devdeck.ai')
  assert.equal(s.token, 'sk_123')
})

test('setSettings patches individual fields', async () => {
  storage.clear()
  await mod.setSettings({ apiUrl: 'https://a', token: 'tok' })
  await mod.setSettings({ token: 'new-tok' })
  const s = await mod.getSettings()
  assert.equal(s.apiUrl, 'https://a', 'apiUrl should survive partial patch')
  assert.equal(s.token, 'new-tok')
})

test('enqueue + getQueue + clearQueue', async () => {
  storage.clear()
  assert.deepEqual(await mod.getQueue(), [])
  await mod.enqueue({ url: 'https://x' })
  await mod.enqueue({ url: 'https://y' })
  const q = await mod.getQueue()
  assert.equal(q.length, 2)
  assert.equal(q[0].input.url, 'https://x')
  assert.ok(typeof q[0].enqueued_at === 'number')
  await mod.clearQueue()
  assert.deepEqual(await mod.getQueue(), [])
})

test('getQueue returns [] when storage has garbage', async () => {
  storage.clear()
  storage.set('devdeck.queue', 'not an array')
  assert.deepEqual(await mod.getQueue(), [])
})
