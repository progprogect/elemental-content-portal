import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import FileUpload from './FileUpload'
import { voicesApi } from '../services/api/voices'

interface VoiceCloningModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function VoiceCloningModal({ isOpen, onClose }: VoiceCloningModalProps) {
  const queryClient = useQueryClient()
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const cloneMutation = useMutation({
    mutationFn: async (data: { file: File; name: string; description?: string }) => {
      return voicesApi.cloneVoice(data.file, {
        name: data.name,
        description: data.description,
      })
    },
    onSuccess: () => {
      setSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['voices'] })
      // Reset form after 2 seconds
      setTimeout(() => {
        handleClose()
      }, 2000)
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || error.message || 'Failed to clone voice')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a']
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload MP3, WAV, or M4A file.')
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }

      setAudioFile(file)
      setError(null)
    }
  }

  const handleClone = () => {
    if (!audioFile) {
      setError('Please select an audio file')
      return
    }

    if (!name.trim()) {
      setError('Please enter a name for the voice')
      return
    }

    setError(null)
    cloneMutation.mutate({
      file: audioFile,
      name: name.trim(),
      description: description.trim() || undefined,
    })
  }

  const handleClose = () => {
    if (!cloneMutation.isPending) {
      setAudioFile(null)
      setName('')
      setDescription('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Clone Voice"
      footer={
        <div className="flex flex-row-reverse gap-3">
          {!success ? (
            <>
              <Button
                variant="primary"
                onClick={handleClone}
                disabled={cloneMutation.isPending || !audioFile || !name.trim()}
              >
                {cloneMutation.isPending ? 'Cloning...' : 'Clone Voice'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={cloneMutation.isPending}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">Voice cloned successfully!</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audio File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/x-m4a"
            onChange={handleFileChange}
            disabled={cloneMutation.isPending}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          {audioFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Supported formats: MP3, WAV, M4A. Max size: 10MB. Minimum length: 1 second.
          </p>
        </div>

        <Input
          label="Voice Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Voice, Brand Voice"
          disabled={cloneMutation.isPending}
          required
        />

        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for this voice"
          disabled={cloneMutation.isPending}
        />
      </div>
    </Modal>
  )
}

