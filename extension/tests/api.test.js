// Zero-dependency test for src/lib/api.js. Uses node's built-in
// http.Server as a stand-in backend and node:test as the runner.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import http from 'node:http'

import { capture, health } from '../src/lib/api.js'

// startStub spins up a one-off HTTP server that runs the provided
// handler, then returns { url, close } so the test can tear it down.
async function startStub(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((res) => {
            server.close(() => res())
          }),
      })
    })
  })
}

test('capture sends bearer + body and decodes response', async () => {
  let seen
  const stub = await startStub((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      seen = {
        method: req.method,
        path: req.url,
        auth: req.headers.authorization,
        body: JSON.parse(body || '{}'),
      }
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          item: { id: 'abc', item_type: 'repo', title: 'foo/bar' },
          enrichment_status: 'queued',
          duplicate_of: null,
        }),
      )
    })
  })
  try {
    const res = await capture({
      apiUrl: stub.url,
      token: 'tok-123',
      input: { url: 'https://github.com/foo/bar', source: 'browser-extension' },
    })
    assert.equal(seen.method, 'POST')
    assert.equal(seen.path, '/api/items/capture')
    assert.equal(seen.auth, 'Bearer tok-123')
    assert.equal(seen.body.url, 'https://github.com/foo/bar')
    assert.equal(seen.body.source, 'browser-extension')
    assert.equal(res.item.id, 'abc')
    assert.equal(res.enrichment_status, 'queued')
  } finally {
    await stub.close()
  }
})

test('capture throws structured error on 4xx', async () => {
  const stub = await startStub((req, res) => {
    res.writeHead(422, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        error: { code: 'MISSING_INPUT', message: 'either url or text is required' },
      }),
    )
  })
  try {
    await assert.rejects(
      capture({ apiUrl: stub.url, token: 't', input: {} }),
      (err) => {
        assert.equal(err.status, 422)
        assert.equal(err.code, 'MISSING_INPUT')
        assert.match(err.message, /either url or text/)
        return true
      },
    )
  } finally {
    await stub.close()
  }
})

test('capture propagates 5xx as err.status', async () => {
  const stub = await startStub((req, res) => {
    res.writeHead(503)
    res.end()
  })
  try {
    await assert.rejects(
      capture({ apiUrl: stub.url, token: 't', input: { url: 'https://x' } }),
      (err) => {
        assert.equal(err.status, 503)
        return true
      },
    )
  } finally {
    await stub.close()
  }
})

test('health resolves on 2xx', async () => {
  const stub = await startStub((req, res) => {
    res.writeHead(200)
    res.end('ok')
  })
  try {
    await health(stub.url)
  } finally {
    await stub.close()
  }
})

test('health throws on non-2xx', async () => {
  const stub = await startStub((req, res) => {
    res.writeHead(500)
    res.end()
  })
  try {
    await assert.rejects(health(stub.url))
  } finally {
    await stub.close()
  }
})
