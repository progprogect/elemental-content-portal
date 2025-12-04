// Background Service Worker for Elemental Content Creation Portal Extension

interface MessagePayload {
  type: string
  payload?: any
}

interface HaygenPreparePayload {
  taskId: string
  publicationId?: string
  apiBaseUrl?: string
  settings?: any
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
    const payload = message.payload as { taskId: string; publicationId?: string; apiBaseUrl?: string; settings?: any }
    
    console.log('[Elemental Extension Background] HAYGEN_PREPARE received:', payload)
    
    if (!payload || !payload.taskId) {
      console.error('[Elemental Extension Background] Invalid payload:', payload)
      sendResponse({ success: false, error: 'Invalid payload' })
      return true
    }
    
    // Store taskId, publicationId, settings, and API URL - extension will fetch data from API
    const storageKey = `haygen_task_${payload.taskId}_${payload.publicationId || ''}`
    console.log('[Elemental Extension Background] Storing task IDs and settings with key:', storageKey)
    
    // Store API URL if provided
    const storageData: any = {
      taskId: payload.taskId,
      publicationId: payload.publicationId,
      settings: payload.settings, // Include settings if provided
    }
    
    if (payload.apiBaseUrl) {
      storageData.apiBaseUrl = payload.apiBaseUrl
      // Also store API URL globally for future use
      chrome.storage.local.set({ api_base_url: payload.apiBaseUrl })
    }
    
    chrome.storage.local.set({
      [storageKey]: storageData,
      // Also store by taskId for backward compatibility
      [`haygen_task_${payload.taskId}`]: storageData,
    }).then(() => {
      console.log('[Elemental Extension Background] Task IDs and settings stored successfully:', storageKey)
      console.log('[Elemental Extension Background] Stored data:', storageData)
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
    
    // Store task data with publicationId and settings
    const storageKey = `haygen_task_${payload.taskId}_${payload.publicationId || ''}`
    console.log('[Elemental Extension Background] Storing external data with key:', storageKey)
    
    const storageData: any = {
      taskId: payload.taskId,
      publicationId: payload.publicationId,
      settings: payload.settings,
    }
    
    if (payload.apiBaseUrl) {
      storageData.apiBaseUrl = payload.apiBaseUrl
      chrome.storage.local.set({ api_base_url: payload.apiBaseUrl })
    }
    
    chrome.storage.local.set({
      [storageKey]: storageData,
      [`haygen_task_${payload.taskId}`]: storageData,
    }).then(() => {
      console.log('[Elemental Extension Background] External data stored successfully')
    })

    // Don't open tab - frontend handles it
    sendResponse({ success: true })
    return true
  }

  return true
})

