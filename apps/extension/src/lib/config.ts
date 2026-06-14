// Configurable DevDeck server URL. The published extension defaults to the
// hosted instance; self-hosters and local devs can override it from the
// options page (persisted in chrome.storage.local). This replaces the
// previously hardcoded http://localhost:8080 that made the built extension
// unusable against any non-local backend.
export const DEFAULT_BASE_URL = 'https://devdeck.ai'

const KEY = 'devdeck.base_url'

export async function getBaseUrl(): Promise<string> {
  try {
    const res = await chrome.storage.local.get(KEY)
    const url = res[KEY]
    return typeof url === 'string' && url.trim() !== '' ? url : DEFAULT_BASE_URL
  } catch {
    return DEFAULT_BASE_URL
  }
}

export async function setBaseUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [KEY]: url.trim().replace(/\/+$/, '') })
}
