import apiClient from './client'

export interface GalleryItem {
  id: string
  mediaUrl: string
  mediaType: 'image' | 'video' | 'file'
  filename?: string
  source: 'manual' | 'haygen' | 'nanobanana'
  createdAt: string
  task?: {
    id: string
    title: string
    contentType: string
  }
  publication?: {
    id: string
    platform: string
    contentType: string
  }
  // Дополнительные поля для действий
  resultUrl?: string
  downloadUrl?: string
  assetPath?: string
  assetUrl?: string
}

export interface GalleryFilters {
  type?: 'all' | 'image' | 'video'
  source?: 'all' | 'manual' | 'haygen' | 'nanobanana'
  taskId?: string
  publicationId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'task'
}

export interface GalleryResponse {
  items: GalleryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const galleryApi = {
  /**
   * Get gallery items with filters
   */
  async getGallery(filters: GalleryFilters = {}): Promise<GalleryResponse> {
    const params = new URLSearchParams()
    
    if (filters.type && filters.type !== 'all') {
      params.append('type', filters.type)
    }
    if (filters.source && filters.source !== 'all') {
      params.append('source', filters.source)
    }
    if (filters.taskId) {
      params.append('taskId', filters.taskId)
    }
    if (filters.publicationId) {
      params.append('publicationId', filters.publicationId)
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom)
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo)
    }
    if (filters.page) {
      params.append('page', filters.page.toString())
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString())
    }
    if (filters.sort && filters.sort !== 'newest') {
      params.append('sort', filters.sort)
    }

    const response = await apiClient.get<GalleryResponse>(
      `/gallery?${params.toString()}`
    )
    return response.data
  },
}

