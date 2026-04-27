// Wave 4.5 §16.11 — DevDeck browser extension service worker.
//
// Responsibilities:
//   1. Listen for the Cmd/Ctrl+Shift+D keyboard command and capture
//      the current tab into DevDeck via POST /api/items/capture.
//   2. Relay popup-initiated captures (the popup can't hit fetch
//      directly because it's short-lived; we centralise network
//      calls here so offline-queue + retries live in one place).
//   3. Drain the offline queue every 60s via chrome.alarms when the
//      backend was unreachable.
//
// Manifest v3 service workers can be killed at any time — don't keep
// module-level state that isn't also in chrome.storage.local.

import { capture } from './lib/api.js'
import { enqueue, getQueue, getSettings, setQueue } from './lib/storage.js'

const QUEUE_ALARM = 'devdeck-drain-queue'

// ─── Install hook: register the retry alarm ───

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(QUEUE_ALARM, { periodInMinutes: 1 })
})

// ─── Keyboard command ───

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'capture-tab') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.url) return
  await captureTab({
    url: tab.url,
    title: tab.title || '',
    source: 'browser-extension',
  })
})

// ─── Popup ↔ background messaging ───

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'devdeck.capture') {
    captureTab(msg.payload)
      .then((res) => sendResponse({ ok: true, res }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: { status: err.status, code: err.code, message: err.message },
        }),
      )
    return true // async response
  }
  if (msg?.type === 'devdeck.queue-length') {
    getQueue().then((q) => sendResponse({ length: q.length }))
    return true
  }
  return false
})

// ─── Alarm: drain offline queue ───

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== QUEUE_ALARM) return
  await drainQueue()
})

// ─── Internals ───

async function captureTab({ url, title, source, whySaved, tags }) {
  const { apiUrl, token } = await getSettings()
  if (!token) {
    // No token configured → queue the item so it can be flushed after
    // the user runs through options once.
    await enqueue({
      source: source || 'browser-extension',
      url,
      title_hint: title,
      why_saved: whySaved,
      tags,
    })
    throw new Error('no token configured; item queued for later')
  }
  try {
    const res = await capture({
      apiUrl,
      token,
      input: {
        source: source || 'browser-extension',
        url,
        title_hint: title,
        why_saved: whySaved,
        tags,
      },
    })
    await updateBadge()
    return res
  } catch (err) {
    // Offline / server 5xx → enqueue and surface the error to the popup.
    if (err.status === undefined || err.status >= 500) {
      await enqueue({
        source: source || 'browser-extension',
        url,
        title_hint: title,
        why_saved: whySaved,
        tags,
      })
      await updateBadge()
    }
    throw err
  }
}

export async function drainQueue() {
  const { apiUrl, token } = await getSettings()
  if (!token) return
  const q = await getQueue()
  if (q.length === 0) return

  const results = await Promise.allSettled(
    q.map((entry) => capture({ apiUrl, token, input: entry.input })),
  )

  const remaining = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'rejected') {
      const err = result.reason
      // Only transient errors stay in the queue. Permanent 4xx are
      // dropped so a malformed item doesn't block the whole queue.
      if (err.status === undefined || err.status >= 500) {
        remaining.push(q[i])
      }
    }
  }
  await setQueue(remaining)
  await updateBadge()
}

async function updateBadge() {
  const q = await getQueue()
  const text = q.length > 0 ? String(q.length) : ''
  try {
    await chrome.action.setBadgeText({ text })
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: '#FF2E63' })
    }
  } catch {
    /* setBadgeText may fail if the action isn't visible yet */
  }
}
