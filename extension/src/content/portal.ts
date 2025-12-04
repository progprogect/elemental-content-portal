// Content script for portal pages
// Listens for postMessage from portal and forwards to background script

console.log('[Elemental Extension] Portal content script loaded')

// Listen for messages from portal page
window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data

  // Log all messages for debugging
  if (message && message.type && (message.type.includes('HAYGEN') || message.type === 'PING')) {
    console.log('[Elemental Extension] Received message from portal:', message.type, message)
  }

  // Handle PING separately - respond immediately
  if (message && message.type === 'PING') {
    console.log('[Elemental Extension] PING received, responding immediately')
    window.postMessage(
      {
        type: 'PING_RESPONSE',
        payload: { success: true },
      },
      '*'
    )
    return
  }

  // Forward HAYGEN_PREPARE messages to background script
  if (message && message.type === 'HAYGEN_PREPARE') {
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

