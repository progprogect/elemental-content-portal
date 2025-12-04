// Main content script for Haygen pages
// Orchestrates prompt filling, asset loading, and result monitoring

import { promptFiller } from './haygen-prompt-filler'
import { assetLoader } from './haygen-asset-loader'
import { resultMonitor } from './haygen-result-monitor'
import { notificationManager } from './notification-manager'

interface HaygenTaskData {
  taskId: string
  publicationId: string
  prompt: string
  assets: Array<{ type: string; url: string; filename: string }>
}

// Check if we're on a Haygen page
function isHaygenPage(): boolean {
  return window.location.hostname.includes('haygen.com') || window.location.hostname.includes('heygen.com')
}

// Initialize automation when page loads
async function initializeAutomation() {
  if (!isHaygenPage()) {
    return
  }

  // Prevent duplicate initialization
  if (isInitialized) {
    return
  }

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (!isInitialized) {
          isInitialized = true
          processStoredData()
        }
      }, 1000)
    })
  } else {
    setTimeout(() => {
      if (!isInitialized) {
        isInitialized = true
        processStoredData()
      }
    }, 1000)
  }
}

// API base URL - можно вынести в конфиг или получать из storage
const API_BASE_URL = 'http://localhost:3000' // или process.env.API_URL

// Process stored task data - now fetches from API
async function processStoredData() {
  try {
    console.log('[Haygen] Starting to process stored data...')
    let taskId: string | null = null
    let publicationId: string | null = null

    // First try chrome.storage (from extension)
    console.log('[Haygen] Checking chrome.storage.local...')
    const storage = await chrome.storage.local.get(null)
    console.log('[Haygen] All storage keys:', Object.keys(storage))
    
    const taskKeys = Object.keys(storage).filter(key => key.startsWith('haygen_task_'))
    console.log('[Haygen] Found task keys:', taskKeys)
    
    if (taskKeys.length > 0) {
      // Get the most recent task data
      // Prefer task with publicationId
      for (const key of taskKeys) {
        const data = storage[key]
        console.log('[Haygen] Checking key:', key, 'data:', data)
        if (data && data.taskId) {
          taskId = data.taskId
          publicationId = data.publicationId || null
          console.log('[Haygen] Found task IDs:', { taskId, publicationId })
          break
        }
      }
    }

    // Fallback: try sessionStorage (from portal)
    if (!taskId) {
      console.log('[Haygen] No data in chrome.storage, checking sessionStorage')
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('haygen_task_')) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key) || '{}')
            console.log('[Haygen] Checking sessionStorage key:', key, 'data:', data)
            if (data && data.taskId) {
              taskId = data.taskId
              publicationId = data.publicationId || null
              console.log('[Haygen] Found task IDs in sessionStorage:', { taskId, publicationId })
              break
            }
          } catch (e) {
            console.warn('[Haygen] Failed to parse sessionStorage item:', key, e)
          }
        }
      }
    }
    
    if (!taskId) {
      // No task data, just start monitoring for manual saves
      console.log('[Haygen] No task ID found in storage or sessionStorage')
      return
    }
    
    console.log('[Haygen] Task IDs found:', { taskId, publicationId })

    // Fetch prompt data from API
    notificationManager.show('Загрузка данных из API...', {
      type: 'info',
      duration: 2000,
    })

    let promptData: HaygenTaskData
    try {
      const apiBaseUrl = await getApiBaseUrl()
      const apiUrl = publicationId
        ? `${apiBaseUrl}/api/prompts/tasks/${taskId}/publications/${publicationId}/generate`
        : `${apiBaseUrl}/api/prompts/tasks/${taskId}/generate`
      
      console.log('[Haygen] Fetching from API:', apiUrl)
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
      
      promptData = await response.json()
      console.log('[Haygen] Prompt data received from API:', promptData)
    } catch (error) {
      console.error('[Haygen] Failed to fetch from API:', error)
      notificationManager.showError('Ошибка при загрузке данных из API. Пожалуйста, выполните действия вручную.')
      return
    }

    // Ensure publicationId exists (fallback to empty string if not present)
    const finalPublicationId = publicationId || ''

    // Start result monitoring
    resultMonitor.startMonitoring(taskId, finalPublicationId)

    // Fill prompt
    notificationManager.show('Инициализация автоматизации...', {
      type: 'info',
      duration: 2000,
    })

    const promptFilled = await promptFiller.fillPrompt(promptData.prompt)

    // Load assets if any
    if (promptData.assets && promptData.assets.length > 0) {
      await assetLoader.loadAssets(promptData.assets)
    }

    // Show success message
    if (promptFilled) {
      notificationManager.showSuccess('Данные загружены! Можно начинать генерацию.')
    } else {
      notificationManager.show(
        'Промпт скопирован в буфер обмена. Вставьте его в поле и загрузите ассеты.',
        {
          type: 'info',
          duration: 5000,
        }
      )
    }

  } catch (error) {
    console.error('Error processing stored data:', error)
    notificationManager.showError('Ошибка при автоматизации. Пожалуйста, выполните действия вручную.')
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HAYGEN_PREPARE') {
    const data = message.payload as { taskId: string; publicationId?: string }
    
    // Store locally and process
    const publicationId = data.publicationId || ''
    chrome.storage.local.set({
      [`haygen_task_${data.taskId}_${publicationId}`]: data,
    }).then(() => {
      processStoredData()
      sendResponse({ success: true })
    })

    return true // Keep channel open
  }

  if (message.type === 'EXTRACT_LINKS') {
    const links = resultMonitor.extractResultLinks()
    sendResponse(links)
    return true
  }
})

// Track if automation is already initialized to prevent duplicate initialization
let isInitialized = false
let navigationObserver: MutationObserver | null = null

// Initialize on page load
initializeAutomation()

// Also listen for navigation changes (SPA)
let lastUrl = location.href
navigationObserver = new MutationObserver(() => {
  const url = location.href
  if (url !== lastUrl) {
    lastUrl = url
    isInitialized = false
    // Reinitialize on navigation
    setTimeout(initializeAutomation, 1000)
  }
})
navigationObserver.observe(document, { subtree: true, childList: true })
