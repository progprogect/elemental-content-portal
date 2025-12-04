import { useState, useEffect } from 'react'

interface ExtensionMessage {
  type: string
  payload?: any
}

// Chrome extension types
declare global {
  interface Window {
    chrome?: {
      runtime: {
        sendMessage: (
          extensionId: string,
          message: any,
          responseCallback?: (response: any) => void
        ) => void
        lastError?: { message: string }
      }
    }
  }
}

// Extension ID - можно вынести в env переменную (не используется, так как используем postMessage)
// const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || ''

export function useExtension() {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if extension is installed by listening for ready signal or sending PING
    let extensionDetected = false
    
    // First, listen for ready signal from extension
    const readyListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'EXTENSION_READY') {
        console.log('[Portal] Extension ready signal received')
        window.removeEventListener('message', readyListener)
        extensionDetected = true
        setIsInstalled(true)
        console.log('[Portal] Extension detected via ready signal')
      }
    }
    
    window.addEventListener('message', readyListener)
    
    // Also try sending PING after a short delay
    const pingTimeout = setTimeout(() => {
      const pingListener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PING_RESPONSE') {
          console.log('[Portal] PING_RESPONSE received')
          window.removeEventListener('message', pingListener)
          extensionDetected = true
          setIsInstalled(true)
          console.log('[Portal] Extension detected via PING')
        }
      }
      
      window.addEventListener('message', pingListener)
      console.log('[Portal] Sending PING to extension')
      window.postMessage({ type: 'PING' }, '*')
      
      // Cleanup after timeout
      setTimeout(() => {
        window.removeEventListener('message', pingListener)
        if (!extensionDetected) {
          console.log('[Portal] Extension not detected, using sessionStorage fallback')
          setIsInstalled(false)
        }
      }, 2000)
    }, 500)
    
    return () => {
      window.removeEventListener('message', readyListener)
      clearTimeout(pingTimeout)
    }
  }, [])

  const sendMessage = async (
    message: ExtensionMessage,
    retries = 3
  ): Promise<any> => {
    if (!isInstalled && retries === 3) {
      throw new Error('Extension not installed')
    }

    try {
      // Always use postMessage for external pages
      // Content script portal.ts will forward to background script
      console.log('[Portal] Sending postMessage:', message.type, message)
      return new Promise((resolve, reject) => {
        window.postMessage(message, '*')

        let timeoutId: number | null = null

        const listener = (event: MessageEvent) => {
          console.log('[Portal] Received message:', event.data)
          if (event.data.type === message.type + '_RESPONSE') {
            window.removeEventListener('message', listener)
            if (timeoutId !== null) {
              clearTimeout(timeoutId)
            }
            console.log('[Portal] Resolving with payload:', event.data.payload)
            resolve(event.data.payload)
          }
        }

        window.addEventListener('message', listener)
        timeoutId = window.setTimeout(() => {
          window.removeEventListener('message', listener)
          console.error('[Portal] Timeout waiting for extension response')
          reject(new Error('Timeout waiting for extension response'))
        }, 10000)
      })
    } catch (error) {
      // Retry logic
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return sendMessage(message, retries - 1)
      }
      throw error
    }
  }

  const prepareHaygenGeneration = async (
    taskId: string,
    publicationId: string
  ): Promise<boolean> => {
    try {
      // Only save taskId and publicationId - extension will fetch data from API
      const payload = {
        taskId,
        publicationId,
      }

      // Try to save via extension first
      try {
        await sendMessage({
          type: 'HAYGEN_PREPARE',
          payload,
        })
        console.log('[Portal] Task IDs saved via extension')
      } catch (error) {
        console.warn('[Portal] Extension not available, using sessionStorage:', error)
        // Fallback: save to sessionStorage for extension to read
        const storageKey = `haygen_task_${taskId}_${publicationId}`
        sessionStorage.setItem(storageKey, JSON.stringify(payload))
        console.log('[Portal] Task IDs saved to sessionStorage')
      }

      return true
    } catch (error) {
      console.error('Failed to prepare Haygen generation:', error)
      return false
    }
  }

  return {
    isInstalled,
    prepareHaygenGeneration,
    sendMessage,
  }
}

