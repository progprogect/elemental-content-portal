import { PromptSettings } from '../../types/prompt-settings'
import apiClient from './client'

export interface PromptData {
  prompt: string
  assets: Array<{ type: string; url: string; filename: string }>
}

export const promptsApi = {
  /**
   * Generate prompt with settings for a publication
   */
  async generatePromptWithSettings(
    taskId: string,
    publicationId: string,
    settings: PromptSettings
  ): Promise<PromptData> {
    const response = await apiClient.post<PromptData>(
      `/prompts/tasks/${taskId}/publications/${publicationId}/generate`,
      { settings }
    )
    return response.data
  },

  /**
   * Generate prompt without settings (fallback)
   */
  async generatePrompt(taskId: string): Promise<PromptData> {
    const response = await apiClient.get<PromptData>(
      `/prompts/tasks/${taskId}/generate`
    )
    return response.data
  },

  /**
   * Generate prompt for publication without settings (fallback)
   */
  async generatePromptForPublication(
    taskId: string,
    publicationId: string
  ): Promise<PromptData> {
    const response = await apiClient.get<PromptData>(
      `/prompts/tasks/${taskId}/publications/${publicationId}/generate`
    )
    return response.data
  },
}

