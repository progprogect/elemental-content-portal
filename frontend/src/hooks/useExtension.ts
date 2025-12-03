import { useState, useEffect } from 'react'

interface ExtensionMessage {
  type: string
  payload?: any
}

export function useExtension() {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if extension is installed
    // Extension ID would be set in environment or config
    const checkExtension = () => {
      // For development, we'll use a simple check
      // In production, this would check for the actual extension ID
      setIsInstalled(true)
    }

    checkExtension()
  }, [])

  const sendMessage = (message: ExtensionMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!isInstalled) {
        reject(new Error('Extension not installed'))
        return
      }

      // Send message to extension
      // In production, use chrome.runtime.sendMessage with extension ID
      window.postMessage(message, '*')

      // Listen for response
      const listener = (event: MessageEvent) => {
        if (event.data.type === message.type + '_RESPONSE') {
          window.removeEventListener('message', listener)
          resolve(event.data.payload)
        }
      }

      window.addEventListener('message', listener)
      setTimeout(() => {
        window.removeEventListener('message', listener)
        reject(new Error('Timeout waiting for extension response'))
      }, 5000)
    })
  }

  const prepareHaygenGeneration = async (taskId: string, prompt: string, assets: Array<{ type: string; url: string; filename: string }>) => {
    try {
      await sendMessage({
        type: 'HAYGEN_PREPARE',
        payload: {
          taskId,
          prompt,
          assets,
        },
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

