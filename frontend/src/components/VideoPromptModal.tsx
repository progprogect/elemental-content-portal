import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { promptsApi } from '../services/api/prompts'
import { PromptSettings } from '../types/prompt-settings'
import Modal from './ui/Modal'
import Button from './ui/Button'

interface VideoPromptModalProps {
  isOpen: boolean
  onClose: () => void
  taskId?: string
  publicationId?: string
  settings?: PromptSettings
  contentType?: string
}

export default function VideoPromptModal({ 
  isOpen, 
  onClose, 
  taskId, 
  publicationId, 
  settings,
  contentType = 'video'
}: VideoPromptModalProps) {
  const [copied, setCopied] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')

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

  // Use different API call based on whether we have taskId/publicationId
  const { data: promptData, isLoading, error } = useQuery({
    queryKey: taskId && publicationId 
      ? ['video-prompt', taskId, publicationId, settingsKey]
      : ['video-prompt-standalone', contentType, settingsKey],
    queryFn: () => {
      if (taskId && publicationId) {
        return promptsApi.generatePromptWithSettings(taskId, publicationId, settings || {})
      } else {
        return promptsApi.generatePromptFromSettings(contentType, settings)
      }
    },
    enabled: isOpen && ((!!taskId && !!publicationId) || !!contentType),
  })

  // Initialize edited prompt when promptData is loaded
  useEffect(() => {
    if (promptData?.prompt) {
      setEditedPrompt(promptData.prompt)
    }
  }, [promptData?.prompt])

  // Reset edited prompt when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditedPrompt('')
      setCopied(false)
    }
  }, [isOpen])

  const handleCopyPrompt = async () => {
    const promptToCopy = editedPrompt || promptData?.prompt
    if (promptToCopy) {
      try {
        await navigator.clipboard.writeText(promptToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleResetPrompt = () => {
    if (promptData?.prompt) {
      setEditedPrompt(promptData.prompt)
    }
  }

  const isPromptEdited = promptData?.prompt && editedPrompt !== promptData.prompt

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
          {isPromptEdited && (
            <Button
              variant="secondary"
              onClick={handleResetPrompt}
              className="ml-3"
            >
              Reset
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleCopyPrompt}
            disabled={(!editedPrompt && !promptData?.prompt) || copied}
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Generated Prompt
                </label>
                {isPromptEdited && (
                  <span className="text-xs text-blue-600 font-medium">
                    Edited
                  </span>
                )}
              </div>
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={15}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                <li>Edit the prompt if needed (you can modify it directly in the text area above)</li>
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

