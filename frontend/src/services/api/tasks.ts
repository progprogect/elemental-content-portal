import apiClient from './client'

export interface Task {
  id: string
  title: string
  contentType: string
  executionType: 'manual' | 'generated'
  status: 'draft' | 'in_progress' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
  fields: TaskField[]
  results: TaskResult[]
}

export interface TaskField {
  id: string
  fieldName: string
  fieldType: 'text' | 'file' | 'url' | 'checkbox'
  fieldValue: any
  orderIndex: number
}

export interface TaskResult {
  id: string
  resultUrl?: string
  downloadUrl?: string
  assetPath?: string
  assetUrl?: string
  source: string
  createdAt: string
}

export interface CreateTaskData {
  title: string
  contentType: string
  executionType?: 'manual' | 'generated'
}

export interface UpdateTaskData {
  title?: string
  contentType?: string
  status?: 'draft' | 'in_progress' | 'completed' | 'failed'
  executionType?: 'manual' | 'generated'
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

export const tasksApi = {
  getTasks: async (params?: { page?: number; limit?: number; status?: string; contentType?: string }) => {
    const response = await apiClient.get<TasksResponse>('/tasks', { params })
    return response.data
  },

  getTask: async (id: string) => {
    const response = await apiClient.get<Task>(`/tasks/${id}`)
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
}

