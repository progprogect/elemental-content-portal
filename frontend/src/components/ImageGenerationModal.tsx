import { useState } from 'react'
import { ImageGenerationSettings } from '../types/prompt-settings'
import { getPresetsForField } from '../config/prompt-presets'
import Modal from './ui/Modal'
import Button from './ui/Button'
import PromptFieldWithPresets from './PromptFieldWithPresets'
import Select from './ui/Select'

interface ImageGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (settings: ImageGenerationSettings) => Promise<void>
  isLoading?: boolean
}

export default function ImageGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}: ImageGenerationModalProps) {
  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState('')
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1')
  const [customStyle, setCustomStyle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const stylePresets = getPresetsForField('stylePreset', 'image')

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
      }
      
      await onGenerate(settings)
      
      // Reset form on success
      setPrompt('')
      setStylePreset('')
      setAspectRatio('1:1')
      setCustomStyle('')
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to generate image')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setPrompt('')
      setStylePreset('')
      setAspectRatio('1:1')
      setCustomStyle('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Image"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="ml-3"
          >
            {isLoading ? 'Generating...' : 'Generate Image'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <PromptFieldWithPresets
          label="Prompt"
          value={prompt}
          onChange={setPrompt}
          placeholder="Describe the image you want to generate..."
          type="textarea"
          required
          presets={[]}
        />

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
    </Modal>
  )
}

