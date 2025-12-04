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
  return window.location.hostname.includes('haygen.com')
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

// Process stored task data from background script
async function processStoredData() {
  try {
    // Get all stored task data
    const storage = await chrome.storage.local.get(null)
    
    // Find task data for current tab
    const taskKeys = Object.keys(storage).filter(key => key.startsWith('haygen_task_'))
    
    if (taskKeys.length === 0) {
      // No task data, just start monitoring for manual saves
      return
    }

    // Get the most recent task data
    // Prefer task with publicationId
    let taskData: HaygenTaskData | null = null
    let taskKey: string | null = null

    for (const key of taskKeys) {
      const data = storage[key]
      if (data && data.taskId && data.publicationId) {
        taskData = data as HaygenTaskData
        taskKey = key
        break
      }
    }

    // Fallback to task without publicationId
    if (!taskData) {
      for (const key of taskKeys) {
        const data = storage[key]
        if (data && data.taskId) {
          taskData = data as HaygenTaskData
          taskKey = key
          break
        }
      }
    }

    if (!taskData || !taskKey) {
      return
    }

    // Ensure publicationId exists (fallback to empty string if not present)
    const publicationId = taskData.publicationId || ''

    // Start result monitoring
    resultMonitor.startMonitoring(taskData.taskId, publicationId)

    // Fill prompt
    notificationManager.show('Инициализация автоматизации...', {
      type: 'info',
      duration: 2000,
    })

    const promptFilled = await promptFiller.fillPrompt(taskData.prompt)

    // Load assets if any
    if (taskData.assets && taskData.assets.length > 0) {
      await assetLoader.loadAssets(taskData.assets)
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

    // Clean up stored data after processing (optional)
    // chrome.storage.local.remove(taskKey)

  } catch (error) {
    console.error('Error processing stored data:', error)
    notificationManager.showError('Ошибка при автоматизации. Пожалуйста, выполните действия вручную.')
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HAYGEN_PREPARE') {
    const data = message.payload as HaygenTaskData
    
    // Ensure publicationId exists
    const publicationId = data.publicationId || ''
    
    // Store locally and process
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
