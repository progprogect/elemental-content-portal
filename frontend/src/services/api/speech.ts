import apiClient from './client'

export interface TranscribeResponse {
  text: string
}

export const speechApi = {
  /**
   * Transcribe audio to text using OpenAI Whisper API
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.webm')

    const response = await apiClient.post<TranscribeResponse>(
      '/transcribe',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.text
  },
}

