import apiClient from './client'

export interface StockMediaItem {
  id: string
  source: 'pexels' | 'unsplash' | 'pixabay'
  type: 'photo' | 'video'
  url: string
  thumbnailUrl?: string
  downloadUrl: string
  width?: number
  height?: number
  photographer?: string
  photographerUrl?: string
  duration?: number
  tags?: string[]
  description?: string
}

export interface StockMediaSearchParams {
  query: string
  type?: 'photo' | 'video' | 'all'
  source?: 'pexels' | 'unsplash' | 'pixabay' | 'all'
  orientation?: 'landscape' | 'portrait' | 'square'
  size?: 'large' | 'medium' | 'small'
  color?: string
  page?: number
  perPage?: number
}

export interface StockMediaSearchResponse {
  items: StockMediaItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export const stockMediaApi = {
  /**
   * Search stock media across all sources
   */
  async search(params: StockMediaSearchParams): Promise<StockMediaSearchResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('query', params.query)
    
    if (params.type && params.type !== 'all') {
      queryParams.append('type', params.type)
    }
    if (params.source && params.source !== 'all') {
      queryParams.append('source', params.source)
    }
    if (params.orientation) {
      queryParams.append('orientation', params.orientation)
    }
    if (params.size) {
      queryParams.append('size', params.size)
    }
    if (params.color) {
      queryParams.append('color', params.color)
    }
    if (params.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params.perPage) {
      queryParams.append('perPage', params.perPage.toString())
    }

    const response = await apiClient.get<StockMediaSearchResponse>(
      `/stock-media/search?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Download stock media and add to gallery
   */
  async downloadAndAddToGallery(item: StockMediaItem): Promise<{
    id: string
    mediaUrl: string
    assetPath: string
    filename: string
    source: string
    createdAt: string
  }> {
    const response = await apiClient.post('/stock-media/download', item)
    return response.data
  },
}

