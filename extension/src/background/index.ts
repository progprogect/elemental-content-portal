// Background Service Worker for Elemental Content Creation Portal Extension

interface MessagePayload {
  type: string
  payload?: any
}

interface HaygenPreparePayload {
  taskId: string
  publicationId: string
  prompt: string
  assets: Array<{ type: string; url: string; filename: string }>
}

interface HaygenResultPayload {
  taskId: string
  publicationId: string
  resultUrl: string
  downloadUrl?: string
  status: 'success' | 'error'
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: MessagePayload, sender, sendResponse) => {
  console.log('[Elemental Extension Background] Received message:', message.type, message)
  
  if (message.type === 'HAYGEN_RESULT') {
    const payload = message.payload as HaygenResultPayload
    
    // Store result data
    chrome.storage.local.set({
      [`haygen_result_${payload.taskId}_${payload.publicationId}`]: payload,
    })

    // Send message to portal if it's open
    chrome.tabs.query({ url: ['http://localhost:5173/*', 'https://*/*'] }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'HAYGEN_RESULT',
            payload: payload,
          }).catch(() => {
            // Portal tab might not have content script, ignore error
          })
        }
      })
    })

    sendResponse({ success: true })
  }

  if (message.type === 'HAYGEN_PREPARE') {
    const payload = message.payload as HaygenPreparePayload
    
    console.log('[Elemental Extension Background] HAYGEN_PREPARE received:', payload)
    
    // Store task data with publicationId for later use
    chrome.storage.local.set({
      [`haygen_task_${payload.taskId}_${payload.publicationId}`]: payload,
      // Also store by taskId for backward compatibility
      [`haygen_task_${payload.taskId}`]: payload,
    }).then(() => {
      console.log('[Elemental Extension Background] Data stored successfully')
    })

    // Open Haygen in new tab
    chrome.tabs.create({
      url: 'https://app.heygen.com/video-agent',
    }).then((tab) => {
      console.log('[Elemental Extension Background] Haygen tab opened:', tab.id)
    }).catch((error) => {
      console.error('[Elemental Extension Background] Failed to open tab:', error)
    })

    sendResponse({ success: true })
    return true // Keep channel open
  }

  if (message.type === 'PING') {
    sendResponse({ success: true })
  }

  return true // Keep channel open for async response
})

// Listen for messages from portal
chrome.runtime.onMessageExternal?.addListener((message: MessagePayload, sender, sendResponse) => {
  if (message.type === 'HAYGEN_PREPARE') {
    const payload = message.payload as HaygenPreparePayload
    
    // Store task data with publicationId
    chrome.storage.local.set({
      [`haygen_task_${payload.taskId}_${payload.publicationId}`]: payload,
      [`haygen_task_${payload.taskId}`]: payload,
    })

    // Open Haygen in new tab
    chrome.tabs.create({
      url: 'https://app.heygen.com/video-agent',
    })

    sendResponse({ success: true })
  }

  return true
})

