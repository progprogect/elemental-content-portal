import apiClient from './client'

export interface Task {
  id: string
  title: string
  contentType: string
  executionType: 'manual' | 'generated'
  status: 'draft' | 'in_progress' | 'completed' | 'failed'
  scheduledDate: string
  listId?: string | null
  list?: {
    id: string
    name: string
    icon?: string
    color?: string
  }
  createdAt: string
  updatedAt: string
  fields: TaskField[]
  results: TaskResult[]
  publications?: TaskPublication[]
}

export interface TaskField {
  id: string
  fieldName: string
  fieldType: 'text' | 'file' | 'url' | 'checkbox'
  fieldValue: any
  orderIndex: number
  taskId?: string
  createdAt?: string
}

export interface TaskResult {
  id: string
  resultUrl?: string
  downloadUrl?: string
  assetPath?: string
  assetUrl?: string
  source: string
  publicationId?: string | null
  createdAt: string
}

export interface CreateTaskData {
  title: string
  contentType: string
  executionType?: 'manual' | 'generated'
  listId?: string | null
  scheduledDate: string
}

export interface UpdateTaskData {
  title?: string
  contentType?: string
  status?: 'draft' | 'in_progress' | 'completed' | 'failed'
  executionType?: 'manual' | 'generated'
  listId?: string | null
  scheduledDate?: string
}

export interface TaskList {
  id: string
  name: string
  icon?: string
  color?: string
  orderIndex: number
  taskCount?: number
  stats?: {
    draft: number
    in_progress: number
    completed: number
    failed: number
  }
}

export interface TableColumn {
  id: string
  fieldName: string
  fieldType: 'text' | 'file' | 'url' | 'checkbox'
  defaultValue?: any
  icon?: string
  orderIndex: number
}

export interface TasksResponse {
  tasks: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface Platform {
  id: string
  code: string
  name: string
  icon?: string
  color?: string
  isActive: boolean
  orderIndex: number
  createdAt: string
}

export interface TaskPublication {
  id: string
  taskId: string
  platform: string
  contentType: string
  executionType: 'manual' | 'generated'
  status: 'draft' | 'in_progress' | 'completed' | 'failed'
  note?: string | null
  content?: string | null
  orderIndex: number
  createdAt: string
  updatedAt: string
  results?: TaskResult[]
}

export interface CreatePublicationData {
  platform: string
  contentType: string
  executionType?: 'manual' | 'generated'
  status?: 'draft' | 'in_progress' | 'completed' | 'failed'
  note?: string | null
  content?: string | null
  orderIndex?: number
}

export interface UpdatePublicationData {
  platform?: string
  contentType?: string
  executionType?: 'manual' | 'generated'
  status?: 'draft' | 'in_progress' | 'completed' | 'failed'
  note?: string | null
  content?: string | null
  orderIndex?: number
}

export const tasksApi = {
  getTasks: async (params?: { page?: number; limit?: number; status?: string; contentType?: string; listId?: string; include?: string }) => {
    const response = await apiClient.get<TasksResponse>('/tasks', { params })
    return response.data
  },

  getTask: async (id: string, include?: string) => {
    const params = include ? { include } : undefined
    const response = await apiClient.get<Task>(`/tasks/${id}`, { params })
    return response.data
  },

  createTask: async (data: CreateTaskData) => {
    const response = await apiClient.post<Task>('/tasks', data)
    return response.data
  },

  updateTask: async (id: string, data: UpdateTaskData) => {
    const response = await apiClient.put<Task>(`/tasks/${id}`, data)
    return response.data
  },

  deleteTask: async (id: string) => {
    await apiClient.delete(`/tasks/${id}`)
  },
}

export const fieldsApi = {
  addField: async (taskId: string, data: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue: any
    orderIndex?: number
  }) => {
    const response = await apiClient.post<TaskField>(`/tasks/${taskId}/fields`, data)
    return response.data
  },

  updateField: async (taskId: string, fieldId: string, data: {
    fieldName?: string
    fieldType?: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue?: any
    orderIndex?: number
  }) => {
    const response = await apiClient.put<TaskField>(`/tasks/${taskId}/fields/${fieldId}`, data)
    return response.data
  },

  deleteField: async (taskId: string, fieldId: string) => {
    await apiClient.delete(`/tasks/${taskId}/fields/${fieldId}`)
  },

  reorderFields: async (taskId: string, fieldIds: string[]) => {
    const response = await apiClient.patch<TaskField[]>(`/tasks/${taskId}/fields/reorder`, { fieldIds })
    return response.data
  },
}

export const resultsApi = {
  getResults: async (taskId: string) => {
    const response = await apiClient.get<TaskResult[]>(`/tasks/${taskId}/results`)
    return response.data
  },

  addResult: async (taskId: string, data: {
    resultUrl?: string
    downloadUrl?: string
    assetPath?: string
    assetUrl?: string
    source?: 'manual' | 'haygen' | 'nanobanana'
    publicationId?: string | null
  }) => {
    const response = await apiClient.post<TaskResult>(`/tasks/${taskId}/results`, data)
    return response.data
  },

  deleteResult: async (taskId: string, resultId: string) => {
    await apiClient.delete(`/tasks/${taskId}/results/${resultId}`)
  },
}

export const filesApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<{
      filename: string
      path: string
      url: string
      size: number
    }>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export const promptsApi = {
  generatePrompt: async (taskId: string) => {
    const response = await apiClient.get<{
      prompt: string
      assets: Array<{ type: string; url: string; filename: string }>
    }>(`/prompts/tasks/${taskId}/generate`)
    return response.data
  },
  generatePromptForPublication: async (taskId: string, publicationId: string) => {
    const response = await apiClient.get<{
      prompt: string
      assets: Array<{ type: string; url: string; filename: string }>
    }>(`/prompts/tasks/${taskId}/publications/${publicationId}/generate`)
    return response.data
  },
}

export const imagesApi = {
  generateImage: async (
    taskId: string,
    publicationId: string,
    settings: {
      prompt: string
      stylePreset?: string
      aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
      customStyle?: string
    }
  ) => {
    const response = await apiClient.post<{
      assetUrl: string
      assetPath: string
    }>(`/tasks/${taskId}/publications/${publicationId}/generate-image`, settings)
    return response.data
  },
  
  generateImagePreview: async (
    taskId: string,
    publicationId: string,
    settings: {
      prompt: string
      stylePreset?: string
      aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
      customStyle?: string
      referenceImageUrl?: string
      refinementPrompt?: string
      useCurrentResultAsReference?: boolean
    }
  ) => {
    const response = await apiClient.post<{
      assetUrl: string
      assetPath: string
    }>(`/tasks/${taskId}/publications/${publicationId}/generate-image-preview`, settings)
    return response.data
  },
  
  saveImageResult: async (
    taskId: string,
    publicationId: string,
    result: {
      assetUrl: string
      assetPath: string
    }
  ) => {
    const response = await apiClient.post<{
      assetUrl: string
      assetPath: string
    }>(`/tasks/${taskId}/publications/${publicationId}/save-image-result`, result)
    return response.data
  },
}

export const taskListsApi = {
  getLists: async () => {
    const response = await apiClient.get<TaskList[]>('/task-lists')
    return response.data
  },

  getListStats: async (id: string) => {
    const response = await apiClient.get<{
      draft: number
      in_progress: number
      completed: number
      failed: number
    }>(`/task-lists/${id}/stats`)
    return response.data
  },

  createList: async (data: { name: string; icon?: string; color?: string }) => {
    const response = await apiClient.post<TaskList>('/task-lists', data)
    return response.data
  },

  updateList: async (id: string, data: { name?: string; icon?: string; color?: string; orderIndex?: number }) => {
    const response = await apiClient.put<TaskList>(`/task-lists/${id}`, data)
    return response.data
  },

  deleteList: async (id: string) => {
    await apiClient.delete(`/task-lists/${id}`)
  },
}

export const tableColumnsApi = {
  getColumns: async () => {
    const response = await apiClient.get<TableColumn[]>('/table-columns')
    return response.data
  },

  getColumn: async (id: string) => {
    const response = await apiClient.get<TableColumn>(`/table-columns/${id}`)
    return response.data
  },

  createColumn: async (data: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    defaultValue?: any
    icon?: string
    orderIndex?: number
  }) => {
    const response = await apiClient.post<TableColumn>('/table-columns', data)
    return response.data
  },

  updateColumn: async (id: string, data: {
    fieldName?: string
    fieldType?: 'text' | 'file' | 'url' | 'checkbox'
    defaultValue?: any
    icon?: string
    orderIndex?: number
  }) => {
    const response = await apiClient.put<TableColumn>(`/table-columns/${id}`, data)
    return response.data
  },

  deleteColumn: async (id: string) => {
    await apiClient.delete(`/table-columns/${id}`)
  },
}

export const platformsApi = {
  getPlatforms: async () => {
    const response = await apiClient.get<Platform[]>('/platforms')
    return response.data
  },
}

export const publicationsApi = {
  getPublications: async (taskId: string) => {
    const response = await apiClient.get<TaskPublication[]>(`/tasks/${taskId}/publications`)
    return response.data
  },

  createPublication: async (taskId: string, data: CreatePublicationData) => {
    const response = await apiClient.post<TaskPublication>(`/tasks/${taskId}/publications`, data)
    return response.data
  },

  updatePublication: async (taskId: string, publicationId: string, data: UpdatePublicationData) => {
    const response = await apiClient.put<TaskPublication>(`/tasks/${taskId}/publications/${publicationId}`, data)
    return response.data
  },

  deletePublication: async (taskId: string, publicationId: string) => {
    await apiClient.delete(`/tasks/${taskId}/publications/${publicationId}`)
  },
}

