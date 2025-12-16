import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { publicationsApi } from '../services/api/tasks'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Select from './ui/Select'
import MDEditor from '@uiw/react-md-editor'

interface TextGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  publicationId: string
  existingContent?: string | null
  onInsert: (content: string, action: 'replace' | 'append') => void
}

type Step = 'input' | 'preview'

export default function TextGenerationModal({
  isOpen,
  onClose,
  taskId,
  publicationId,
  existingContent,
  onInsert,
}: TextGenerationModalProps) {
  const [step, setStep] = useState<Step>('input')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [tone, setTone] = useState<'casual' | 'professional' | 'engaging' | 'formal' | ''>('')
  const [length, setLength] = useState<'short' | 'medium' | 'long' | ''>('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [showReplaceAppendDialog, setShowReplaceAppendDialog] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('input')
      setAdditionalInstructions('')
      setShowAdvanced(false)
      setTone('')
      setLength('')
      setGeneratedContent('')
      setShowReplaceAppendDialog(false)
    }
  }, [isOpen])

  const generateMutation = useMutation({
    mutationFn: () =>
      publicationsApi.generateContent(taskId, publicationId, {
        additionalInstructions: additionalInstructions.trim() || undefined,
        tone: tone || undefined,
        length: length || undefined,
      }),
    onSuccess: (data) => {
      setGeneratedContent(data.content)
      setStep('preview')
    },
    onError: (error: any) => {
      console.error('Text generation error:', error)
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to generate text')
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate()
  }

  const handleInsert = () => {
    if (!generatedContent || generatedContent.trim().length === 0) {
      return
    }
    if (existingContent && existingContent.trim().length > 0) {
      setShowReplaceAppendDialog(true)
    } else {
      onInsert(generatedContent, 'replace')
      onClose()
    }
  }

  const handleReplaceAppend = (action: 'replace' | 'append') => {
    if (!generatedContent || generatedContent.trim().length === 0) {
      return
    }
    onInsert(generatedContent, action)
    setShowReplaceAppendDialog(false)
    onClose()
  }

  const handleRegenerate = () => {
    setStep('input')
    // Keep the current input values for regeneration
  }

  const toneOptions = [
    { value: '', label: 'Default' },
    { value: 'casual', label: 'Casual' },
    { value: 'professional', label: 'Professional' },
    { value: 'engaging', label: 'Engaging' },
    { value: 'formal', label: 'Formal' },
  ]

  const lengthOptions = [
    { value: '', label: 'Default' },
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' },
  ]

  return (
    <>
      <Modal
        isOpen={isOpen && !showReplaceAppendDialog}
        onClose={onClose}
        title={step === 'input' ? 'Generate Text' : 'Generated Text Preview'}
        footer={
          step === 'input' ? (
            <>
              <Button variant="secondary" onClick={onClose} disabled={generateMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="ml-3"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate Text'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleRegenerate} className="ml-3">
                Regenerate
              </Button>
              <Button 
                variant="primary" 
                onClick={handleInsert} 
                className="ml-3"
                disabled={!generatedContent || generatedContent.trim().length === 0}
              >
                Insert
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {step === 'input' && (
            <>
              {generateMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {(generateMutation.error as any)?.response?.data?.error ||
                      (generateMutation.error as any)?.response?.data?.message ||
                      'Failed to generate text'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should the text be about? (optional)
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  placeholder="E.g., Make it engaging and casual, include emojis..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showAdvanced"
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="showAdvanced" className="ml-2 text-sm text-gray-700">
                  Show advanced options
                </label>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                  <Select
                    label="Tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                    options={toneOptions}
                  />
                  <Select
                    label="Length"
                    value={length}
                    onChange={(e) => setLength(e.target.value as any)}
                    options={lengthOptions}
                  />
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Text Preview
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-300">
                  <div className="text-xs text-gray-600">Markdown Preview</div>
                </div>
                <div className="p-4 min-h-[300px] max-h-[500px] overflow-y-auto prose prose-sm max-w-none">
                  <MDEditor.Markdown source={generatedContent || ''} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Replace/Append Dialog */}
      {showReplaceAppendDialog && (
        <Modal
          isOpen={showReplaceAppendDialog}
          onClose={() => setShowReplaceAppendDialog(false)}
          title="Content Already Exists"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowReplaceAppendDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleReplaceAppend('append')}
                className="ml-3"
              >
                Append to existing content
              </Button>
              <Button
                variant="primary"
                onClick={() => handleReplaceAppend('replace')}
                className="ml-3"
              >
                Replace existing content
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Content already exists in the editor. What would you like to do?
            </p>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Existing content preview:</div>
              <div className="text-sm text-gray-800 line-clamp-3">
                {existingContent?.substring(0, 200)}
                {existingContent && existingContent.length > 200 ? '...' : ''}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

