// Background Service Worker for Elemental Content Creation Portal Extension

interface MessagePayload {
  type: string
  payload?: any
}

interface HaygenPreparePayload {
  taskId: string
  publicationId?: string
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
    const payload = message.payload as { taskId: string; publicationId?: string }
    
    console.log('[Elemental Extension Background] HAYGEN_PREPARE received:', payload)
    
    if (!payload || !payload.taskId) {
      console.error('[Elemental Extension Background] Invalid payload:', payload)
      sendResponse({ success: false, error: 'Invalid payload' })
      return true
    }
    
    // Store only taskId and publicationId - extension will fetch data from API
    const storageKey = `haygen_task_${payload.taskId}_${payload.publicationId || ''}`
    console.log('[Elemental Extension Background] Storing task IDs with key:', storageKey)
    
    chrome.storage.local.set({
      [storageKey]: payload,
      // Also store by taskId for backward compatibility
      [`haygen_task_${payload.taskId}`]: payload,
    }).then(() => {
      console.log('[Elemental Extension Background] Task IDs stored successfully:', storageKey)
      console.log('[Elemental Extension Background] Stored data:', payload)
    }).catch((error) => {
      console.error('[Elemental Extension Background] Failed to store data:', error)
    })

    // Don't open tab here - frontend handles it
    // The content script on Haygen page will read from storage and fetch from API

    sendResponse({ success: true })
    return true // Keep channel open
  }

  if (message.type === 'PING') {
    sendResponse({ success: true })
  }

  return true // Keep channel open for async response
})

// Listen for messages from portal (via externally_connectable)
chrome.runtime.onMessageExternal?.addListener((message: MessagePayload, sender, sendResponse) => {
  console.log('[Elemental Extension Background] External message received:', message.type, message)
  
  if (message.type === 'HAYGEN_PREPARE') {
    const payload = message.payload as HaygenPreparePayload
    
    if (!payload || !payload.taskId) {
      console.error('[Elemental Extension Background] Invalid external payload:', payload)
      sendResponse({ success: false, error: 'Invalid payload' })
      return true
    }
    
    // Store task data with publicationId
    const storageKey = `haygen_task_${payload.taskId}_${payload.publicationId || ''}`
    console.log('[Elemental Extension Background] Storing external data with key:', storageKey)
    
    chrome.storage.local.set({
      [storageKey]: payload,
      [`haygen_task_${payload.taskId}`]: payload,
    }).then(() => {
      console.log('[Elemental Extension Background] External data stored successfully')
    })

    // Don't open tab - frontend handles it
    sendResponse({ success: true })
    return true
  }

  return true
})

