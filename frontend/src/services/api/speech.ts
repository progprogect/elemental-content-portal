import apiClient from './client'
import { SpeechSettings } from '../../types/prompt-settings'

export interface GeneratePreviewData {
  text: string
  voiceId: string
  settings?: SpeechSettings
}

export interface SpeechPreviewResult {
  audioUrl: string
  audioPath: string
}

export interface SaveSpeechResultData {
  audioUrl: string
  audioPath: string
  taskId?: string
  publicationId?: string
}

export interface SaveSpeechResultResponse {
  id: string
  assetUrl: string
  assetPath: string
  source: string
}

export const speechApi = {
  /**
   * Generate speech preview (without saving to database)
   */
  async generatePreview(data: GeneratePreviewData): Promise<SpeechPreviewResult> {
    const response = await apiClient.post<SpeechPreviewResult>(
      '/speech/generate-preview',
      data
    )
    return response.data
  },

  /**
   * Save speech result to gallery/publication
   */
  async saveResult(data: SaveSpeechResultData): Promise<SaveSpeechResultResponse> {
    const response = await apiClient.post<SaveSpeechResultResponse>(
      '/speech/save-result',
      data
    )
    return response.data
  },
}
