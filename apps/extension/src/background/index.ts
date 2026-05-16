/**
 * DevDeck Extension Background Script (MV3)
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('DevDeck Extension installed');
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

    const resp = await fetch('http://localhost:8080/api/items/check', {
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
    console.log('Capture command triggered');
  }
});
