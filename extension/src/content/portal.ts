// Content script for portal pages
// Listens for postMessage from portal and forwards to background script

console.log('[Elemental Extension] Portal content script loaded')

// Listen for messages from portal page
window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data

  // Log all messages for debugging
  if (message.type && (message.type.includes('HAYGEN') || message.type === 'PING')) {
    console.log('[Elemental Extension] Received message:', message.type, message)
  }

  // Forward HAYGEN_PREPARE and PING messages to background script
  if (message.type === 'HAYGEN_PREPARE' || message.type === 'PING') {
    console.log('[Elemental Extension] Forwarding to background script:', message.type)
    
    chrome.runtime.sendMessage(message, (response) => {
      console.log('[Elemental Extension] Background response:', response)
      
      if (chrome.runtime.lastError) {
        console.error('[Elemental Extension] Background error:', chrome.runtime.lastError)
        // Send error response back
        window.postMessage(
          {
            type: message.type + '_RESPONSE',
            payload: { error: chrome.runtime.lastError.message },
          },
          '*'
        )
      } else {
        // Send response back to portal
        window.postMessage(
          {
            type: message.type + '_RESPONSE',
            payload: response,
          },
          '*'
        )
      }
    })
  }
})

