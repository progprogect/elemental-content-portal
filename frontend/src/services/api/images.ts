import apiClient from './client'
import { ImageGenerationSettings } from '../../types/prompt-settings'
import { GalleryItem } from './gallery'

export interface ImageGenerationResult {
  assetUrl: string
  assetPath: string
}

export interface AddToGalleryData {
  assetUrl: string
  assetPath: string
  source?: 'manual' | 'haygen' | 'nanobanana'
}

export const imagesApi = {
  /**
   * Generate image without task/publication context (standalone mode)
   */
  async generateStandaloneImage(settings: ImageGenerationSettings): Promise<ImageGenerationResult> {
    const response = await apiClient.post<ImageGenerationResult>(
      '/images/generate-standalone',
      settings
    )
    return response.data
  },

  /**
   * Add generated image to gallery without task/publication context
   */
  async addToGallery(data: AddToGalleryData): Promise<GalleryItem> {
    const response = await apiClient.post<GalleryItem>(
      '/gallery/add-item',
      {
        assetUrl: data.assetUrl,
        assetPath: data.assetPath,
        source: data.source || 'nanobanana',
      }
    )
    return response.data
  },
}

