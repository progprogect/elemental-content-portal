import { useState } from 'react'
import { ImageGenerationSettings } from '../types/prompt-settings'
import { getPresetsForField } from '../config/prompt-presets'
import Modal from './ui/Modal'
import Button from './ui/Button'
import PromptFieldWithPresets from './PromptFieldWithPresets'
import Select from './ui/Select'
import FileUpload from './FileUpload'
import MediaPreview from './MediaPreview'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface ImageGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (settings: ImageGenerationSettings) => Promise<{ assetUrl: string; assetPath: string }>
  onRegenerate?: (settings: ImageGenerationSettings) => Promise<{ assetUrl: string; assetPath: string }>
  onSaveResult?: (result: { assetUrl: string; assetPath: string }) => Promise<void>
  isLoading?: boolean
  isSaving?: boolean
}

export default function ImageGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  onRegenerate,
  onSaveResult,
  isLoading = false,
  isSaving = false,
}: ImageGenerationModalProps) {
  // Settings state
  const [prompt, setPrompt] = useState('')
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null)
  const [stylePreset, setStylePreset] = useState('')
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1')
  const [customStyle, setCustomStyle] = useState('')
  
  // Result state
  const [currentResult, setCurrentResult] = useState<{ assetUrl: string; assetPath: string } | null>(null)
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false)
  
  // UI state
  const [error, setError] = useState<string | null>(null)

  const stylePresets = getPresetsForField('stylePreset', 'image')

  const handleReferenceImageUpload = async (file: { filename: string; path: string; url: string; size: number }) => {
    setReferenceImageUrl(file.url)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Prompt is required')
      return
    }

    setError(null)
    
    try {
      const settings: ImageGenerationSettings = {
        prompt: prompt.trim(),
        aspectRatio,
        ...(stylePreset && { stylePreset }),
        ...(customStyle.trim() && { customStyle: customStyle.trim() }),
        ...(referenceImageUrl && { referenceImageUrl }),
      }
      
      const result = await onGenerate(settings)
      setCurrentResult(result)
      setIsSettingsExpanded(false)
    } catch (err: any) {
      setError(err.message || 'Failed to generate image')
    }
  }

  const handleRegenerate = async () => {
    if (!currentResult) return

    setError(null)
    
    try {
      // Regenerate with original settings (without refinement, without using current result as reference)
      const settings: ImageGenerationSettings = {
        prompt: prompt.trim(),
        aspectRatio,
        ...(stylePreset && { stylePreset }),
        ...(customStyle.trim() && { customStyle: customStyle.trim() }),
        ...(referenceImageUrl && { referenceImageUrl }),
      }
      
      const result = await onGenerate(settings)
      setCurrentResult(result)
      setRefinementPrompt('')
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate image')
    }
  }

  const handleRefine = async () => {
    if (!currentResult) return

    if (!refinementPrompt.trim()) {
      setError('Please enter refinement instructions')
      return
    }

    setError(null)
    
    try {
      // Apply refinement to current result (use current result as reference + refinement prompt)
      const settings: ImageGenerationSettings = {
        prompt: prompt.trim(),
        aspectRatio,
        ...(stylePreset && { stylePreset }),
        ...(customStyle.trim() && { customStyle: customStyle.trim() }),
        refinementPrompt: refinementPrompt.trim(),
        useCurrentResultAsReference: true,
        referenceImageUrl: currentResult.assetUrl,
      }
      
      if (onRegenerate) {
        const result = await onRegenerate(settings)
        setCurrentResult(result)
        setRefinementPrompt('')
      } else {
        // Fallback to onGenerate if onRegenerate not provided
        const result = await onGenerate(settings)
        setCurrentResult(result)
        setRefinementPrompt('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refine image')
    }
  }

  const handleSaveResult = async () => {
    if (!currentResult || !onSaveResult) return

    setError(null)
    
    try {
      await onSaveResult(currentResult)
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save result')
    }
  }

  const handleClose = () => {
    if (!isLoading && !isSaving) {
      // Reset all state
      setPrompt('')
      setReferenceImageUrl(null)
      setStylePreset('')
      setAspectRatio('1:1')
      setCustomStyle('')
      setCurrentResult(null)
      setRefinementPrompt('')
      setIsSettingsExpanded(false)
      setError(null)
      onClose()
    }
  }

  const hasResult = currentResult !== null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Image"
      footer={
        <div className="flex flex-row-reverse gap-3">
          {!hasResult ? (
            <>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
              >
                {isLoading ? 'Generating...' : 'Generate Image'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading || isSaving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleSaveResult}
                disabled={isLoading || isSaving}
              >
                {isSaving ? 'Saving...' : 'Add to Result'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRefine}
                disabled={isLoading || isSaving || !refinementPrompt.trim()}
              >
                {isLoading ? 'Refining...' : 'Apply Refinement'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRegenerate}
                disabled={isLoading || isSaving}
              >
                {isLoading ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading || isSaving}
              >
                Cancel
              </Button>
            </>
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

        {/* Result Section - shown after generation */}
        {hasResult && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Result:</label>
              <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-100">
                <MediaPreview
                  url={currentResult.assetUrl}
                  type="image"
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <PromptFieldWithPresets
                label="Refine"
                value={refinementPrompt}
                onChange={setRefinementPrompt}
                placeholder="Enter changes you want to make to the image..."
                type="textarea"
                presets={[]}
              />
            </div>

            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span>Settings</span>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    isSettingsExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {/* Settings Section - always shown, but collapsed after generation */}
        {(!hasResult || isSettingsExpanded) && (
          <div className={`space-y-4 ${hasResult ? 'border-t pt-4' : ''}`}>
            <PromptFieldWithPresets
              label="Prompt"
              value={prompt}
              onChange={setPrompt}
              placeholder="Describe the image you want to generate..."
              type="textarea"
              required
              presets={[]}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Reference Image (optional)
              </label>
              {referenceImageUrl ? (
                <div className="space-y-2">
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                    <MediaPreview
                      url={referenceImageUrl}
                      type="image"
                      className="w-full h-full"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setReferenceImageUrl(null)}
                    className="text-sm"
                  >
                    Remove Reference Image
                  </Button>
                </div>
              ) : (
                <FileUpload
                  onUploadComplete={handleReferenceImageUpload}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              )}
            </div>

            {stylePresets.length > 0 && (
              <div className="space-y-2">
                <Select
                  label="Style Preset (optional)"
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                  options={[
                    { value: '', label: 'No preset' },
                    ...stylePresets.map(preset => ({
                      value: preset.id,
                      label: preset.label,
                    })),
                  ]}
                />
                <p className="text-xs text-gray-500">
                  Select a style preset to apply to your image. You can also add custom style instructions below.
                </p>
              </div>
            )}

            <Select
              label="Aspect Ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
              options={[
                { value: '1:1', label: '1:1 (Square)' },
                { value: '16:9', label: '16:9 (Landscape)' },
                { value: '9:16', label: '9:16 (Portrait)' },
                { value: '4:3', label: '4:3 (Standard)' },
                { value: '3:4', label: '3:4 (Portrait Standard)' },
              ]}
            />

            <PromptFieldWithPresets
              label="Custom Style (optional)"
              value={customStyle}
              onChange={setCustomStyle}
              placeholder="Add any additional style instructions..."
              type="textarea"
              presets={[]}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
