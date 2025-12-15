import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { promptsApi } from '../services/api/prompts'
import { PromptSettings } from '../types/prompt-settings'
import Modal from './ui/Modal'
import Button from './ui/Button'

interface VideoPromptModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  publicationId: string
  settings?: PromptSettings
}

export default function VideoPromptModal({ 
  isOpen, 
  onClose, 
  taskId, 
  publicationId, 
  settings 
}: VideoPromptModalProps) {
  const [copied, setCopied] = useState(false)

  // Create stable key from settings object to avoid unnecessary re-renders
  const settingsKey = useMemo(() => {
    if (!settings || Object.keys(settings).length === 0) {
      return null
    }
    // Sort keys to ensure consistent stringification
    const sorted = Object.keys(settings).sort().reduce((acc, key) => {
      const typedKey = key as keyof PromptSettings
      acc[typedKey] = settings[typedKey]
      return acc
    }, {} as Record<string, any>)
    return JSON.stringify(sorted)
  }, [settings])

  const { data: promptData, isLoading, error } = useQuery({
    queryKey: ['video-prompt', taskId, publicationId, settingsKey],
    queryFn: () => promptsApi.generatePromptWithSettings(taskId, publicationId, settings || {}),
    enabled: isOpen && !!taskId && !!publicationId,
  })

  const handleCopyPrompt = async () => {
    if (promptData?.prompt) {
      try {
        await navigator.clipboard.writeText(promptData.prompt)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleOpenHeyGen = () => {
    window.open('https://app.heygen.com/video-agent', '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Video in HeyGen"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleCopyPrompt}
            disabled={!promptData?.prompt || copied}
            className="ml-3"
          >
            {copied ? 'Copied!' : 'Copy Prompt'}
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenHeyGen}
            className="ml-3"
          >
            Open HeyGen Video Agent
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-4">Generating prompt...</div>
        )}

        {error && (
          <div className="text-center py-4 text-red-600">
            Failed to generate prompt: {(error as any).response?.data?.error || 'Unknown error'}
          </div>
        )}

        {promptData && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Prompt
              </label>
              <textarea
                readOnly
                value={promptData.prompt}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                rows={15}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                <li>Click "Copy Prompt" to copy the prompt to your clipboard</li>
                <li>Click "Open HeyGen Video Agent" to open HeyGen in a new tab</li>
                <li>Paste the prompt into HeyGen and generate your video</li>
                <li>After generation, add the result back to this publication</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

