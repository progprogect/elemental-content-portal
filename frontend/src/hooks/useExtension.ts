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

// Extension ID - можно вынести в env переменную
const EXTENSION_ID = process.env.VITE_EXTENSION_ID || ''

export function useExtension() {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if extension is installed
    const checkExtension = async () => {
      // Try to use chrome.runtime API if available
      if (typeof chrome !== 'undefined' && chrome.runtime && EXTENSION_ID) {
        try {
          // Try to send a ping message to check if extension is installed
          await new Promise<void>((resolve, reject) => {
            chrome.runtime.sendMessage(
              EXTENSION_ID,
              { type: 'PING' },
              (response) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError)
                } else {
                  resolve()
                }
              }
            )
            setTimeout(() => reject(new Error('Timeout')), 1000)
          })
          setIsInstalled(true)
        } catch (error) {
          // Extension not installed or not responding
          setIsInstalled(false)
        }
      } else {
        // Fallback: assume extension is installed for development
        // In production, this should be properly configured
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
      if (typeof chrome !== 'undefined' && chrome.runtime && EXTENSION_ID) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            message,
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else if (response && response.success) {
                resolve(response.payload)
              } else {
                reject(new Error('Extension returned error'))
              }
            }
          )
          setTimeout(() => reject(new Error('Timeout waiting for extension response')), 10000)
        })
      }

      // Fallback to postMessage for development
      return new Promise((resolve, reject) => {
        window.postMessage(message, '*')

        let timeoutId: NodeJS.Timeout | null = null

        const listener = (event: MessageEvent) => {
          if (event.data.type === message.type + '_RESPONSE') {
            window.removeEventListener('message', listener)
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            resolve(event.data.payload)
          }
        }

        window.addEventListener('message', listener)
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', listener)
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

      await sendMessage({
        type: 'HAYGEN_PREPARE',
        payload,
      })
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

