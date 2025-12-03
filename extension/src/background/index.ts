// Background Service Worker for Elemental Content Creation Portal Extension

interface MessagePayload {
  type: string
  payload?: any
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: MessagePayload, sender, sendResponse) => {
  if (message.type === 'HAYGEN_RESULT') {
    // Store result data
    chrome.storage.local.set({
      [`haygen_result_${message.payload.taskId}`]: message.payload,
    })

    // Send message to portal if it's open
    chrome.tabs.query({ url: ['http://localhost:5173/*', 'https://*/*'] }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'HAYGEN_RESULT',
            payload: message.payload,
          }).catch(() => {
            // Portal tab might not have content script, ignore error
          })
        }
      })
    })

    sendResponse({ success: true })
  }

  if (message.type === 'HAYGEN_PREPARE') {
    // Store task data for later use
    chrome.storage.local.set({
      [`haygen_task_${message.payload.taskId}`]: message.payload,
    })

    sendResponse({ success: true })
  }

  return true // Keep channel open for async response
})

// Listen for messages from portal
chrome.runtime.onMessageExternal?.addListener((message: MessagePayload, sender, sendResponse) => {
  if (message.type === 'HAYGEN_PREPARE') {
    // Store task data
    chrome.storage.local.set({
      [`haygen_task_${message.payload.taskId}`]: message.payload,
    })

    // Open Haygen in new tab
    chrome.tabs.create({
      url: 'https://haygen.com/create',
    })

    sendResponse({ success: true })
  }

  return true
})

