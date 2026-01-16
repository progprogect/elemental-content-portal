import apiClient from './client'

export interface GenerationRequest {
  prompt: string
  videos?: Array<{ id: string; path: string }>
  images?: Array<{ id: string; path: string }>
  references?: Array<{ id: string; pathOrUrl: string }>
  aspectRatio?: number
  reviewScenario?: boolean
  reviewScenes?: boolean
  taskId?: string
  publicationId?: string
}

export interface SceneGeneration {
  id: string
  taskId?: string | null
  publicationId?: string | null
  status: string
  phase: string
  progress: number
  prompt?: string | null
  enrichedContext?: any
  scenario?: any
  sceneProjects?: any
  resultUrl?: string | null
  resultPath?: string | null
  error?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  scenes?: Scene[]
}

export interface Scene {
  id: string
  sceneGenerationId: string
  sceneId: string
  kind: string
  status: string
  progress: number
  sceneProject?: any
  renderedAssetPath?: string | null
  renderedAssetUrl?: string | null
  error?: string | null
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export const sceneGenerationApi = {
  generate: async (data: GenerationRequest): Promise<{ id: string; status: string; phase: string; progress: number }> => {
    const response = await apiClient.post('/scene-generation/generate', data)
    return response.data
  },

  getList: async (filters?: { status?: string; phase?: string }): Promise<SceneGeneration[]> => {
    const response = await apiClient.get('/scene-generation', { params: filters })
    return response.data
  },

  getStatus: async (generationId: string): Promise<SceneGeneration> => {
    const response = await apiClient.get(`/scene-generation/${generationId}`)
    return response.data
  },

  getScenario: async (generationId: string): Promise<{ id: string; scenario: any; status: string; phase: string }> => {
    const response = await apiClient.get(`/scene-generation/${generationId}/scenario`)
    return response.data
  },

  updateScenario: async (generationId: string, scenario: any): Promise<{ id: string; scenario: any }> => {
    const response = await apiClient.put(`/scene-generation/${generationId}/scenario`, { scenario })
    return response.data
  },

  regenerateScene: async (generationId: string, sceneId: string): Promise<void> => {
    await apiClient.post(`/scene-generation/${generationId}/scenes/${sceneId}/regenerate`)
  },

  cancel: async (generationId: string): Promise<{ id: string; status: string }> => {
    const response = await apiClient.delete(`/scene-generation/${generationId}`)
    return response.data
  },

  continue: async (generationId: string): Promise<{ id: string; status: string }> => {
    const response = await apiClient.post(`/scene-generation/${generationId}/continue`)
    return response.data
  },
}

