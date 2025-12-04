// Content script for portal pages
// Listens for postMessage from portal and forwards to background script

console.log('[Elemental Extension] Portal content script loaded')

// Listen for ALL messages to debug
window.addEventListener('message', (event: MessageEvent) => {
  // Log all messages for debugging
  if (event.data && event.data.type) {
    console.log('[Elemental Extension] Received message:', event.data.type, event.data, 'source:', event.source === window ? 'same window' : 'other')
  }
})

// Listen for messages from portal page
window.addEventListener('message', (event: MessageEvent) => {
  // Only process messages from same window (not iframes)
  if (event.source !== window) {
    console.log('[Elemental Extension] Ignoring message from iframe')
    return
  }
  
  const message = event.data
  if (!message || !message.type) {
    console.log('[Elemental Extension] Ignoring message without type')
    return
  }

  // Log all messages for debugging
  if (message.type.includes('HAYGEN') || message.type === 'PING') {
    console.log('[Elemental Extension] Processing message from portal:', message.type, message)
  }

  // Handle PING separately - respond immediately
  if (message.type === 'PING') {
    console.log('[Elemental Extension] PING received, responding immediately')
    window.postMessage(
      {
        type: 'PING_RESPONSE',
        payload: { success: true },
      },
      '*'
    )
    console.log('[Elemental Extension] PING_RESPONSE sent')
    return
  }

  // Forward HAYGEN_PREPARE messages to background script
  if (message.type === 'HAYGEN_PREPARE') {
    console.log('[Elemental Extension] Forwarding to background script:', message.type, message.payload)
    
    chrome.runtime.sendMessage(message, (response) => {
      console.log('[Elemental Extension] Background response:', response)
      
      if (chrome.runtime.lastError) {
        console.error('[Elemental Extension] Background error:', chrome.runtime.lastError)
        // Send error response back
        window.postMessage(
          {
            type: message.type + '_RESPONSE',
            payload: { error: chrome.runtime.lastError.message, success: false },
          },
          '*'
        )
      } else {
        // Send response back to portal
        window.postMessage(
          {
            type: message.type + '_RESPONSE',
            payload: response || { success: true },
          },
          '*'
        )
      }
    })
  }
})

// Also send a ready signal immediately
console.log('[Elemental Extension] Sending ready signal')
window.postMessage(
  {
    type: 'EXTENSION_READY',
    payload: { success: true },
  },
  '*'
)

