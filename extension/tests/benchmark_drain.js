
import http from 'node:http'

// Mock chrome environment for testing background.js in Node
const storage = new Map()
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener: () => {} },
    onMessage: { addListener: () => {} },
  },
  commands: {
    onCommand: { addListener: () => {} },
  },
  alarms: {
    create: () => {},
    onAlarm: { addListener: () => {} },
  },
  action: {
    setBadgeText: () => Promise.resolve(),
    setBadgeBackgroundColor: () => Promise.resolve(),
  },
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
    },
  },
}

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

const { drainQueue } = await import('../src/background.js')

async function runBenchmark() {
  storage.clear()

  const queue = [
    { input: { url: 'https://a.com' } },
    { input: { url: 'https://b.com' } },
    { input: { url: 'https://c.com' } },
    { input: { url: 'https://d.com' } },
    { input: { url: 'https://e.com' } }
  ]
  storage.set('devdeck.queue', queue)
  storage.set('devdeck.token', 'test-token')

  const stub = await startStub(async (req, res) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50))

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })

  storage.set('devdeck.apiUrl', stub.url)

  const start = Date.now()
  await drainQueue()
  const end = Date.now()

  console.log(`Benchmark took ${end - start}ms`)

  await stub.close()
}

runBenchmark().catch(err => {
  console.error(err)
  process.exit(1)
})
