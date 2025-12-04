// Result monitoring and extraction for Haygen

import { getSelectors } from '../config/haygen-selectors'
import { findElementByMultipleSelectors } from '../utils/dom-helpers'
import { notificationManager } from './notification-manager'

interface HaygenResult {
  taskId: string
  publicationId: string
  resultUrl: string
  downloadUrl?: string
  status: 'success' | 'error'
}

class ResultMonitor {
  private observer: MutationObserver | null = null
  private isMonitoring = false
  private taskId: string | null = null
  private publicationId: string | null = null
  private lastCheckedLinks: { shareLink?: string; downloadLink?: string } = {}

  /**
   * Start monitoring for results
   */
  startMonitoring(taskId: string, publicationId: string): void {
    if (this.isMonitoring) {
      console.warn('Already monitoring, stopping previous monitor')
      this.stopMonitoring()
    }

    this.taskId = taskId
    this.publicationId = publicationId
    this.isMonitoring = true

    // Inject save button
    this.injectSaveButton(taskId, publicationId)

    // Start DOM observer
    this.observer = new MutationObserver(() => {
      this.checkForResults()
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Initial check
    this.checkForResults()

    console.log('Result monitoring started for task:', taskId, 'publication:', publicationId)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.isMonitoring = false
    this.taskId = null
    this.publicationId = null
  }

  /**
   * Check for result links in DOM
   */
  private checkForResults(): void {
    if (!this.isMonitoring || !this.taskId) {
      return
    }
    // publicationId can be empty string, which is valid

    const links = this.extractResultLinks()

    // Check if links have changed
    if (
      links.shareLink !== this.lastCheckedLinks.shareLink ||
      links.downloadLink !== this.lastCheckedLinks.downloadLink
    ) {
      this.lastCheckedLinks = links

      // If we have a share link, send result
      if (links.shareLink) {
        this.sendResult({
          taskId: this.taskId,
          publicationId: this.publicationId,
          resultUrl: links.shareLink,
          downloadUrl: links.downloadLink,
          status: 'success',
        }).catch((error) => {
          console.error('Failed to send result automatically:', error)
          // Don't show error notification here - user can use manual button
        })
      }
    }
  }

  /**
   * Extract share and download links from page
   */
  extractResultLinks(): { shareLink?: string; downloadLink?: string } {
    const shareSelectors = getSelectors('shareLink')
    const downloadSelectors = getSelectors('downloadLink')

    let shareLink: string | undefined
    let downloadLink: string | undefined

    // Try to find share link
    const shareElement = findElementByMultipleSelectors(shareSelectors)
    if (shareElement) {
      if (shareElement instanceof HTMLAnchorElement) {
        shareLink = shareElement.href
      } else if (shareElement instanceof HTMLButtonElement) {
        shareLink = shareElement.getAttribute('data-share-link') || undefined
      } else {
        const link = shareElement.querySelector('a')
        if (link) {
          shareLink = link.href
        }
      }
    }

    // Try to find download link
    const downloadElement = findElementByMultipleSelectors(downloadSelectors)
    if (downloadElement) {
      if (downloadElement instanceof HTMLAnchorElement) {
        downloadLink = downloadElement.href
      } else if (downloadElement instanceof HTMLButtonElement) {
        downloadLink = downloadElement.getAttribute('data-download-link') || undefined
      } else {
        const link = downloadElement.querySelector('a')
        if (link) {
          downloadLink = link.href
        }
      }
    }

    // Fallback: search all links
    if (!shareLink || !downloadLink) {
      const allLinks = document.querySelectorAll('a[href]')
      allLinks.forEach((link) => {
        const href = (link as HTMLAnchorElement).href
        if (href.includes('share') && !shareLink) {
          shareLink = href
        }
        if (href.includes('download') && !downloadLink) {
          downloadLink = href
        }
      })
    }

    return { shareLink, downloadLink }
  }

  /**
   * Inject "Save to Portal" button
   */
  private injectSaveButton(taskId: string, publicationId: string): void {
    // Check if button already exists
    if (document.getElementById('elemental-save-button')) {
      return
    }

    // Wait for page to be ready
    const tryInject = () => {
      // Try to find a suitable container
      const containers = [
        document.querySelector('.actions'),
        document.querySelector('.toolbar'),
        document.querySelector('[class*="action"]'),
        document.querySelector('[class*="toolbar"]'),
        document.querySelector('[class*="result"]'),
        document.body,
      ]

      let container: Element | null = null
      for (const c of containers) {
        if (c) {
          container = c
          break
        }
      }

      if (!container) {
        // Retry after a delay
        setTimeout(tryInject, 1000)
        return
      }

      const button = document.createElement('button')
      button.id = 'elemental-save-button'
      button.textContent = '💾 Save to Portal'
      button.style.cssText = `
        padding: 8px 16px;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        margin-left: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      `

      button.addEventListener('click', async () => {
        const links = this.extractResultLinks()

        if (!links.shareLink) {
          notificationManager.showError('Не удалось найти ссылку на результат')
          return
        }

        button.textContent = 'Saving...'
        button.disabled = true

        try {
          await this.sendResult({
            taskId,
            publicationId,
            resultUrl: links.shareLink,
            downloadUrl: links.downloadLink,
            status: 'success',
          })

          button.textContent = '✓ Saved!'
          notificationManager.showSuccess('Результат сохранен в портал!')
        } catch (error) {
          console.error('Error saving result:', error)
          button.textContent = '💾 Save to Portal'
          button.disabled = false
          notificationManager.showError('Ошибка при сохранении результата')
        }
      })

      container.appendChild(button)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInject)
    } else {
      tryInject()
    }
  }

  /**
   * Send result to background script
   */
  private async sendResult(result: HaygenResult): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'HAYGEN_RESULT',
          payload: result,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else if (response && response.success) {
            resolve()
          } else {
            reject(new Error('Failed to send result'))
          }
        }
      )
    })
  }
}

// Export singleton instance
export const resultMonitor = new ResultMonitor()

