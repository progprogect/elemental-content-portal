// Automatic prompt filling for Haygen

import { getSelectors } from '../config/haygen-selectors'
import { findElementByMultipleSelectors, waitForElementBySelectors, setInputValue, scrollIntoView } from '../utils/dom-helpers'
import { notificationManager } from './notification-manager'

class PromptFiller {
  /**
   * Fill prompt in Haygen interface
   * Returns true if successful, false if fallback to clipboard
   */
  async fillPrompt(prompt: string): Promise<boolean> {
    try {
      notificationManager.showProgress('Заполнение промпта...', 0)
      
      // Try DOM fill first
      const success = await this.tryDomFill(prompt)
      
      if (success) {
        notificationManager.showSuccess('Промпт успешно заполнен!')
        return true
      } else {
        // Fallback to clipboard
        await this.clipboardFallback(prompt)
        return false
      }
    } catch (error) {
      console.error('Error filling prompt:', error)
      notificationManager.showError('Ошибка при заполнении промпта')
      // Try clipboard fallback
      await this.clipboardFallback(prompt)
      return false
    }
  }

  /**
   * Try to fill prompt using DOM manipulation
   */
  private async tryDomFill(prompt: string): Promise<boolean> {
    try {
      // Wait for page to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve)
          } else {
            resolve(null)
          }
        })
      }

      // Wait a bit more for dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Get selectors for prompt field
      const selectors = getSelectors('promptField')

      // Try to find element
      let element: HTMLTextAreaElement | HTMLInputElement | null = null

      // First try immediate find
      const foundElement = findElementByMultipleSelectors(selectors)
      if (foundElement && (foundElement instanceof HTMLTextAreaElement || foundElement instanceof HTMLInputElement)) {
        element = foundElement
      } else {
        // Wait for element to appear
        try {
          const waitedElement = await waitForElementBySelectors(selectors, 5000)
          if (waitedElement instanceof HTMLTextAreaElement || waitedElement instanceof HTMLInputElement) {
            element = waitedElement
          }
        } catch (error) {
          console.warn('Prompt field not found:', error)
          return false
        }
      }

      if (!element) {
        return false
      }

      // Scroll into view
      scrollIntoView(element)

      // Clear existing value
      element.value = ''

      // Set new value
      setInputValue(element, prompt)

      // Verify the value was set
      if (element.value === prompt || element.value.includes(prompt.substring(0, 50))) {
        return true
      }

      return false
    } catch (error) {
      console.error('Error in DOM fill:', error)
      return false
    }
  }

  /**
   * Fallback: copy prompt to clipboard and show instructions
   */
  private async clipboardFallback(prompt: string): Promise<void> {
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(prompt)
      
      notificationManager.show(
        'Промпт скопирован в буфер обмена! Вставьте его в поле (Ctrl+V или Cmd+V)',
        {
          type: 'info',
          duration: 8000,
        }
      )
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      notificationManager.showError(
        'Не удалось скопировать промпт. Пожалуйста, скопируйте его вручную из модального окна.'
      )
    }
  }
}

// Export singleton instance
export const promptFiller = new PromptFiller()

