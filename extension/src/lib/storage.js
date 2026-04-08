// Thin wrapper over chrome.storage.local with promise ergonomics.
// All persistent state lives under these keys so we have a single
// place to reason about schema evolution:
//
//   devdeck.apiUrl   – backend root, e.g. https://api.devdeck.ai
//   devdeck.token    – bearer token (token-mode auth)
//   devdeck.queue    – JSON array of pending CaptureInput objects that
//                      failed to POST; retried by the alarm in
//                      background.js

const KEYS = {
  apiUrl: 'devdeck.apiUrl',
  token: 'devdeck.token',
  queue: 'devdeck.queue',
}

const DEFAULT_API_URL = 'http://localhost:8080'

export async function getSettings() {
  const { [KEYS.apiUrl]: apiUrl, [KEYS.token]: token } = await chrome.storage.local.get([
    KEYS.apiUrl,
    KEYS.token,
  ])
  return {
    apiUrl: apiUrl || DEFAULT_API_URL,
    token: token || '',
  }
}

export async function setSettings({ apiUrl, token }) {
  const patch = {}
  if (apiUrl !== undefined) patch[KEYS.apiUrl] = apiUrl
  if (token !== undefined) patch[KEYS.token] = token
  await chrome.storage.local.set(patch)
}

export async function getQueue() {
  const { [KEYS.queue]: q } = await chrome.storage.local.get(KEYS.queue)
  return Array.isArray(q) ? q : []
}

export async function setQueue(queue) {
  await chrome.storage.local.set({ [KEYS.queue]: queue })
}

export async function enqueue(input) {
  const q = await getQueue()
  q.push({ input, enqueued_at: Date.now() })
  await setQueue(q)
}

export async function clearQueue() {
  await setQueue([])
}
