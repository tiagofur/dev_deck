// Wave 4.5 §16.11 — thin client for POST /api/items/capture.
//
// Kept as plain JS (no bundler) so the extension is "Load unpacked"
// from the repo without a build step. When we move to a React popup
// with vite-plugin-web-extension this file becomes the same module.

/**
 * capture sends a single item to the DevDeck backend.
 *
 * @param {object} opts
 * @param {string} opts.apiUrl  - backend root (no trailing slash)
 * @param {string} opts.token   - bearer token from chrome.storage.local
 * @param {object} opts.input   - CaptureInput body (url/text/tags/etc.)
 * @returns {Promise<object>}   - CaptureResponse or throws {status, code, message}
 */
export async function capture({ apiUrl, token, input }) {
  const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/items/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    // Decode the standard {error:{code,message}} envelope so the
    // popup can show a meaningful message inline.
    let payload = {}
    try {
      payload = await res.json()
    } catch {
      /* empty */
    }
    const err = new Error(payload?.error?.message || res.statusText)
    err.status = res.status
    err.code = payload?.error?.code || 'UNKNOWN'
    throw err
  }
  return res.json()
}

/**
 * health hits /healthz so the options page can verify a token works
 * before persisting it.
 */
export async function health(apiUrl) {
  const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/healthz`)
  if (!res.ok) {
    throw new Error(`healthz ${res.status}`)
  }
}

/**
 * verifyAuth hits a protected endpoint so the options page can confirm
 * both reachability and that the provided token/JWT is actually usable.
 */
export async function verifyAuth(apiUrl, token) {
  const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/repos?limit=1`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    let payload = {}
    try {
      payload = await res.json()
    } catch {
      /* empty */
    }
    const err = new Error(payload?.error?.message || res.statusText)
    err.status = res.status
    err.code = payload?.error?.code || 'UNKNOWN'
    throw err
  }
}
