import { useState, useEffect } from 'react'

interface ExtensionMessage {
  type: string
  payload?: any
}

interface HaygenPreparePayload {
  taskId: string
  publicationId: string
  prompt: string
  assets: Array<{ type: string; url: string; filename: string }>
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

// Extension ID - можно вынести в env переменную
const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || ''

export function useExtension() {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if extension is installed
    const checkExtension = async () => {
      // Try to use chrome.runtime API if available
      if (typeof window !== 'undefined' && window.chrome?.runtime) {
        try {
          // Try to send a ping message to check if extension is installed
          // For locally installed extensions, we can send without extension ID
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Timeout')), 1000)
            const targetId = EXTENSION_ID || undefined // Use undefined if no ID (works for local extensions)
            
            window.chrome!.runtime.sendMessage(
              targetId as any,
              { type: 'PING' },
              () => {
                clearTimeout(timeoutId)
                if (window.chrome?.runtime.lastError) {
                  reject(new Error(window.chrome.runtime.lastError.message))
                } else {
                  resolve()
                }
              }
            )
          })
          setIsInstalled(true)
        } catch (error) {
          // Extension not installed or not responding
          setIsInstalled(false)
        }
      } else {
        // Fallback: assume extension is installed for development
        setIsInstalled(true)
      }
    }

    checkExtension()
  }, [])

  const sendMessage = async (
    message: ExtensionMessage,
    retries = 3
  ): Promise<any> => {
    if (!isInstalled && retries === 3) {
      throw new Error('Extension not installed')
    }

    try {
      // Try chrome.runtime API first if available
      // For locally installed extensions, we can send without extension ID
      if (typeof window !== 'undefined' && window.chrome?.runtime) {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timeout waiting for extension response')), 10000)
          const targetId = EXTENSION_ID || undefined // Use undefined if no ID (works for local extensions)
          
          window.chrome!.runtime.sendMessage(
            targetId as any,
            message,
            (response: any) => {
              clearTimeout(timeoutId)
              if (window.chrome?.runtime.lastError) {
                reject(new Error(window.chrome.runtime.lastError.message))
              } else if (response && response.success) {
                resolve(response.payload)
              } else {
                reject(new Error('Extension returned error'))
              }
            }
          )
        })
      }

      // Fallback to postMessage for development
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
    publicationId: string,
    prompt: string,
    assets: Array<{ type: string; url: string; filename: string }>
  ): Promise<boolean> => {
    try {
      const payload: HaygenPreparePayload = {
        taskId,
        publicationId,
        prompt,
        assets,
      }

      // Try to save via extension first
      try {
        await sendMessage({
          type: 'HAYGEN_PREPARE',
          payload,
        })
        console.log('[Portal] Data saved via extension')
      } catch (error) {
        console.warn('[Portal] Extension not available, using sessionStorage:', error)
        // Fallback: save to sessionStorage for extension to read
        const storageKey = `haygen_task_${taskId}_${publicationId}`
        sessionStorage.setItem(storageKey, JSON.stringify(payload))
        console.log('[Portal] Data saved to sessionStorage')
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

