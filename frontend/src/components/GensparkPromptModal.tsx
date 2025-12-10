import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trainingTopicsApi } from '../services/api/training'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { DocumentDuplicateIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface GensparkPromptModalProps {
  isOpen: boolean
  onClose: () => void
  topicId: string
}

export default function GensparkPromptModal({ isOpen, onClose, topicId }: GensparkPromptModalProps) {
  const [copied, setCopied] = useState(false)

  const { data: promptData, isLoading, error } = useQuery({
    queryKey: ['genspark-prompt', topicId],
    queryFn: () => trainingTopicsApi.generateGensparkPrompt(topicId),
    enabled: isOpen && !!topicId,
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

  const handleOpenGenspark = () => {
    window.open('https://www.genspark.ai/agents?type=super_agent', '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Presentation in Genspark"
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
            <DocumentDuplicateIcon className="h-4 w-4 mr-2 inline" />
            {copied ? 'Copied!' : 'Copy Prompt'}
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenGenspark}
            className="ml-3"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2 inline" />
            Open Genspark Superagent
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
                <li>Click "Open Genspark Superagent" to open Genspark in a new tab</li>
                <li>Paste the prompt into Genspark and generate your presentation</li>
                <li>After generation, upload the presentation file or add the link back to this topic</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

