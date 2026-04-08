// Wave 4.5 §16.11 — popup logic. Kept as plain JS so the extension
// loads unpacked with zero build tooling.
//
// Flow:
//   1. On open, read the active tab and pre-fill the preview.
//   2. On Save, send a message to background.js which handles the
//      actual fetch (so the popup can be killed without losing the
//      in-flight request).
//   3. On success close the popup; on error inline the message.
//
// We never touch the token directly here — it lives in
// chrome.storage.local and only the background service worker reads
// it, so the popup doesn't need storage permission in its own chain.

const $ = (id) => document.getElementById(id)

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab) {
    $('preview-title').textContent = tab.title || '(sin título)'
    $('preview-url').textContent = tab.url || ''
    $('preview-url').title = tab.url || ''
  }

  // Show queue size if there are pending retries so users know.
  const { length } = await sendMessage({ type: 'devdeck.queue-length' })
  if (length > 0) {
    const q = $('queue-status')
    q.textContent = `${length} pendientes · se reintentan en background`
    q.hidden = false
  }

  $('options-link').addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })

  $('cancel').addEventListener('click', () => window.close())

  $('save').addEventListener('click', () => onSave(tab))

  // Enter = save, Escape = cancel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) onSave(tab)
    if (e.key === 'Escape') window.close()
  })

  // Focus the first empty field so Enter-to-save works immediately.
  $('why').focus()
}

async function onSave(tab) {
  if (!tab) return
  showError(null)
  const why = $('why').value.trim()
  const tagsRaw = $('tags').value.trim()
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined

  $('save').disabled = true
  $('save').textContent = 'Guardando…'

  const resp = await sendMessage({
    type: 'devdeck.capture',
    payload: {
      source: 'browser-extension',
      url: tab.url,
      title: tab.title,
      whySaved: why || undefined,
      tags,
    },
  })
  if (resp?.ok) {
    window.close()
    return
  }
  showError(resp?.error?.message || 'Error desconocido')
  $('save').disabled = false
  $('save').textContent = 'Guardar'
}

function showError(message) {
  const el = $('error')
  if (!message) {
    el.hidden = true
    el.textContent = ''
    return
  }
  el.hidden = false
  el.textContent = message
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: { message: chrome.runtime.lastError.message } })
        return
      }
      resolve(response || { ok: false })
    })
  })
}

init().catch((err) => showError(err?.message || String(err)))
