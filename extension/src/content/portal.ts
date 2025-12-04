// Content script for portal pages
// Listens for postMessage from portal and forwards to background script

// Listen for messages from portal page
window.addEventListener('message', (event: MessageEvent) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) {
    return
  }

  const message = event.data

  // Forward HAYGEN_PREPARE messages to background script
  if (message.type === 'HAYGEN_PREPARE') {
    chrome.runtime.sendMessage(message, (response) => {
      // Send response back to portal
      window.postMessage(
        {
          type: message.type + '_RESPONSE',
          payload: response,
        },
        window.location.origin
      )
    })
  }
})

