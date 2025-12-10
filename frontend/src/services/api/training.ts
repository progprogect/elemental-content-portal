import apiClient from './client'

export interface TrainingRole {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface TrainingTopic {
  id: string
  title: string
  description?: string | null
  presentationScript?: string | null
  createdAt: string
  updatedAt: string
  roles: TrainingRole[]
  assets: TrainingAsset[]
  test?: TrainingTest | null
}

export interface TrainingAsset {
  id: string
  topicId: string
  assetPath?: string | null
  assetUrl?: string | null
  externalUrl?: string | null
  filename?: string | null
  size?: number | null
  assetType: 'video' | 'presentation' | 'other'
  source: string
  createdAt: string
}

export interface TrainingTest {
  id: string
  trainingTopicId: string
  generatedTestContent: string
  createdAt: string
  updatedAt: string
}

export interface CreateTopicData {
  title: string
  description?: string | null
  roleIds?: string[]
}

export interface UpdateTopicData {
  title?: string
  description?: string | null
  presentationScript?: string | null
  roleIds?: string[]
}

export interface CreateRoleData {
  name: string
  description?: string | null
}

export interface UpdateRoleData {
  name?: string
  description?: string | null
}

export interface UpdateTestData {
  generatedTestContent: string
}

export interface HeyGenPromptData {
  prompt: string
}

export interface GensparkPromptData {
  prompt: string
}

export interface AddAssetLinkData {
  url: string
  filename?: string
  assetType?: 'video' | 'presentation'
}

export const trainingTopicsApi = {
  getTopics: async () => {
    const response = await apiClient.get<TrainingTopic[]>('/training-topics')
    return response.data
  },

  getTopic: async (id: string) => {
    const response = await apiClient.get<TrainingTopic>(`/training-topics/${id}`)
    return response.data
  },

  createTopic: async (data: CreateTopicData) => {
    const response = await apiClient.post<TrainingTopic>('/training-topics', data)
    return response.data
  },

  updateTopic: async (id: string, data: UpdateTopicData) => {
    const response = await apiClient.put<TrainingTopic>(`/training-topics/${id}`, data)
    return response.data
  },

  deleteTopic: async (id: string) => {
    await apiClient.delete(`/training-topics/${id}`)
  },

  generateHeyGenPrompt: async (id: string) => {
    const response = await apiClient.get<HeyGenPromptData>(`/training-topics/${id}/heygen-prompt`)
    return response.data
  },

  generateGensparkPrompt: async (id: string) => {
    const response = await apiClient.get<GensparkPromptData>(`/training-topics/${id}/genspark-prompt`)
    return response.data
  },
}

export const trainingRolesApi = {
  getRoles: async () => {
    const response = await apiClient.get<TrainingRole[]>('/training-roles')
    return response.data
  },

  createRole: async (data: CreateRoleData) => {
    const response = await apiClient.post<TrainingRole>('/training-roles', data)
    return response.data
  },

  updateRole: async (id: string, data: UpdateRoleData) => {
    const response = await apiClient.put<TrainingRole>(`/training-roles/${id}`, data)
    return response.data
  },

  deleteRole: async (id: string) => {
    await apiClient.delete(`/training-roles/${id}`)
  },
}

export const trainingAssetsApi = {
  getAssets: async (topicId: string) => {
    const response = await apiClient.get<TrainingAsset[]>(`/training-topics/${topicId}/assets`)
    return response.data
  },

  uploadAsset: async (topicId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<TrainingAsset>(`/training-topics/${topicId}/assets`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadPresentation: async (topicId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<TrainingAsset>(`/training-topics/${topicId}/assets/presentation`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  addAssetLink: async (topicId: string, data: AddAssetLinkData) => {
    const response = await apiClient.post<TrainingAsset>(`/training-topics/${topicId}/assets/link`, data)
    return response.data
  },

  deleteAsset: async (topicId: string, assetId: string) => {
    await apiClient.delete(`/training-topics/${topicId}/assets/${assetId}`)
  },
}

export const trainingTestsApi = {
  getTest: async (topicId: string) => {
    const response = await apiClient.get<TrainingTest>(`/training-topics/${topicId}/test`)
    return response.data
  },

  generateTest: async (topicId: string) => {
    const response = await apiClient.post<TrainingTest>(`/training-topics/${topicId}/test/generate`)
    return response.data
  },

  updateTest: async (topicId: string, testId: string, data: UpdateTestData) => {
    const response = await apiClient.put<TrainingTest>(`/training-topics/${topicId}/test/${testId}`, data)
    return response.data
  },
}

