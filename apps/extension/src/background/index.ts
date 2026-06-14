/**
 * DevDeck Extension Background Script (MV3)
 */
import { getBaseUrl } from '../lib/config'

chrome.runtime.onInstalled.addListener(() => {
  // Register context menus
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Guardar link en DevDeck',
    contexts: ['link']
  });
  
  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Guardar selección como nota en DevDeck',
    contexts: ['selection']
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    handleCheckURL(message.url).then(sendResponse)
    return true // mandatory for async sendResponse
  }
})

async function handleCheckURL(url: string) {
  try {
    const { access } = await chrome.storage.local.get('access')
    if (!access) return { item: null }

    const baseUrl = await getBaseUrl()
    const resp = await fetch(`${baseUrl}/api/items/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access}`,
      },
      body: JSON.stringify({ url }),
    })

    if (!resp.ok) return { item: null }
    return await resp.json()
  } catch (err) {
    console.error('Check URL failed:', err)
    return { item: null }
  }
}

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) {
        handleCapture({ url: tab.url, title_hint: tab.title })
      }
    })
  }
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-link' && info.linkUrl) {
    handleCapture({ url: info.linkUrl, source: 'context_menu_link' })
  } else if (info.menuItemId === 'save-selection' && info.selectionText) {
    handleCapture({
      item_type: 'note',
      notes: info.selectionText,
      title_hint: `Nota desde: ${tab?.title || 'página web'}`,
      url: tab?.url,
      source: 'context_menu_selection',
    })
  }
})

interface CapturePayload {
  url?: string
  title_hint?: string
  item_type?: string
  notes?: string
  source?: string
}

async function handleCapture(payload: CapturePayload) {
  try {
    const { access } = await chrome.storage.local.get('access')
    if (!access) {
      console.warn('DevDeck: No access token found')
      return
    }

    const baseUrl = await getBaseUrl()
    const resp = await fetch(`${baseUrl}/api/items/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access}`,
      },
      body: JSON.stringify(payload),
    })

    if (resp.ok) {
      chrome.action.setBadgeText({ text: 'OK' })
      chrome.action.setBadgeBackgroundColor({ color: '#4ade80' })
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
    } else {
      chrome.action.setBadgeText({ text: 'ERR' })
      chrome.action.setBadgeBackgroundColor({ color: '#f87171' })
    }
  } catch (err) {
    console.error('Quick capture failed:', err)
  }
}
