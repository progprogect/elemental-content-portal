// Automatic asset loading for Haygen

interface Asset {
  type: string
  url: string
  filename: string
}

import { getSelectors } from '../config/haygen-selectors'
import { findElementByMultipleSelectors, waitForElementBySelectors, scrollIntoView } from '../utils/dom-helpers'
import { fetchAsBlob, createFileFromBlob, guessMimeType } from '../utils/file-helpers'
import { notificationManager } from './notification-manager'

class AssetLoader {
  /**
   * Load all assets into Haygen interface
   */
  async loadAssets(assets: Asset[]): Promise<void> {
    if (assets.length === 0) {
      return
    }

    notificationManager.showProgress(`Загрузка ассетов (0/${assets.length})...`, 0)

    let successfulUploads = 0

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      const progress = Math.round(((i + 1) / assets.length) * 100)
      
      try {
        notificationManager.showProgress(
          `Загрузка ассета ${i + 1}/${assets.length}: ${asset.filename}`,
          progress
        )

        await this.loadSingleAsset(asset)
        successfulUploads++

        // Wait between uploads to avoid overwhelming the interface
        if (i < assets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`Error loading asset ${asset.filename}:`, error)
        notificationManager.showError(
          `Ошибка при загрузке ${asset.filename}. Продолжаем...`
        )
        // Continue with next asset
      }
    }

    if (successfulUploads === assets.length) {
      notificationManager.showSuccess(`Все ассеты загружены (${assets.length})!`)
    } else {
      notificationManager.show(
        `Загружено ${successfulUploads} из ${assets.length} ассетов`,
        { type: 'warning', duration: 4000 }
      )
    }
  }

  /**
   * Load a single asset
   */
  private async loadSingleAsset(asset: Asset): Promise<void> {
    try {
      // Fetch file as blob
      const blob = await fetchAsBlob(asset.url)
      
      // Create File object
      const mimeType = guessMimeType(asset.filename)
      const file = createFileFromBlob(blob, asset.filename, mimeType)

      // Find file input
      const fileInput = await this.findFileInput()
      if (!fileInput) {
        throw new Error('File input not found')
      }

      // Scroll into view
      scrollIntoView(fileInput)

      // Create DataTransfer and set files
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      
      // Set files on input
      fileInput.files = dataTransfer.files

      // Trigger change event
      const changeEvent = new Event('change', {
        bubbles: true,
        cancelable: true,
      })
      fileInput.dispatchEvent(changeEvent)

      // Also try input event
      const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true,
      })
      fileInput.dispatchEvent(inputEvent)

      // Wait a bit for upload to process
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error('Error in loadSingleAsset:', error)
      throw error
    }
  }

  /**
   * Find file input element
   */
  private async findFileInput(): Promise<HTMLInputElement | null> {
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

    // Get selectors for file input
    const selectors = getSelectors('fileInput')

    // Try to find element
    try {
      const foundElement = findElementByMultipleSelectors(selectors)
      if (foundElement instanceof HTMLInputElement && foundElement.type === 'file') {
        return foundElement
      }

      // Wait for element to appear
      const waitedElement = await waitForElementBySelectors(selectors, 5000)
      if (waitedElement instanceof HTMLInputElement && waitedElement.type === 'file') {
        return waitedElement
      }
    } catch (error) {
      console.warn('File input not found:', error)
      return null
    }

    return null
  }
}

// Export singleton instance
export const assetLoader = new AssetLoader()

