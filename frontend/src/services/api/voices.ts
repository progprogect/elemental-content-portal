import apiClient from './client'

export interface Voice {
  id: string
  name: string
  elevenlabsId?: string | null
  voiceType: 'cloned' | 'premium'
  description?: string | null
  sampleUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface CloneVoiceData {
  name: string
  description?: string
}

export const voicesApi = {
  /**
   * Get all voices (premium + cloned)
   */
  async getVoices(): Promise<Voice[]> {
    const response = await apiClient.get<{ voices: Voice[] }>('/voices')
    return response.data.voices
  },

  /**
   * Get voice by ID
   */
  async getVoice(id: string): Promise<Voice> {
    const response = await apiClient.get<Voice>(`/voices/${id}`)
    return response.data
  },

  /**
   * Clone a voice from audio file
   */
  async cloneVoice(file: File, data: CloneVoiceData): Promise<Voice> {
    const formData = new FormData()
    formData.append('audioFile', file)
    formData.append('name', data.name)
    if (data.description) {
      formData.append('description', data.description)
    }

    const response = await apiClient.post<Voice>('/voices/clone', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Delete a cloned voice
   */
  async deleteVoice(id: string): Promise<void> {
    await apiClient.delete(`/voices/${id}`)
  },
}

