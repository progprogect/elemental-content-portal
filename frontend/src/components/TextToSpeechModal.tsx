import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from './ui/Modal'
import Button from './ui/Button'
import VoiceSelector from './VoiceSelector'
import Select from './ui/Select'
import { speechApi } from '../services/api/speech'
import { SpeechSettings } from '../types/prompt-settings'
import { galleryApi } from '../services/api/gallery'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface TextToSpeechModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'standalone' | 'publication'
  taskId?: string
  publicationId?: string
}

export default function TextToSpeechModal({
  isOpen,
  onClose,
  mode = 'standalone',
  taskId,
  publicationId,
}: TextToSpeechModalProps) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [settings, setSettings] = useState<SpeechSettings>({
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
    modelId: 'eleven_multilingual_v2',
  })
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false)
  const [currentResult, setCurrentResult] = useState<{ audioUrl: string; audioPath: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter text to generate speech')
      return
    }

    if (!voiceId) {
      setError('Please select a voice')
      return
    }

    if (text.length > 5000) {
      setError('Text must be 5000 characters or less')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const result = await speechApi.generatePreview({
        text: text.trim(),
        voiceId,
        settings,
      })
      setCurrentResult(result)
      setIsSettingsExpanded(false)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to generate speech')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!currentResult) return
    await handleGenerate()
  }

  const handleSaveResult = async () => {
    if (!currentResult) return

    setError(null)
    setIsSaving(true)

    try {
      if (mode === 'standalone') {
        // Save to gallery
        await galleryApi.addItem({
          assetUrl: currentResult.audioUrl,
          assetPath: currentResult.audioPath,
          source: 'elevenlabs',
        })
        queryClient.invalidateQueries({ queryKey: ['gallery'] })
      } else {
        // Save to publication
        await speechApi.saveResult({
          audioUrl: currentResult.audioUrl,
          audioPath: currentResult.audioPath,
          taskId,
          publicationId,
        })
        if (taskId) {
          queryClient.invalidateQueries({ queryKey: ['task', taskId] })
        }
      }
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save result')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating && !isSaving) {
      setText('')
      setVoiceId('')
      setSettings({
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
        modelId: 'eleven_multilingual_v2',
      })
      setIsSettingsExpanded(false)
      setCurrentResult(null)
      setError(null)
      onClose()
    }
  }

  const hasResult = currentResult !== null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Text to Speech"
      footer={
        <div className="flex flex-row-reverse gap-3">
          {!hasResult ? (
            <>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim() || !voiceId}
              >
                {isGenerating ? 'Generating...' : 'Generate Speech'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isGenerating || isSaving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleSaveResult}
                disabled={isGenerating || isSaving}
              >
                {isSaving ? 'Saving...' : mode === 'standalone' ? 'Add to Gallery' : 'Add to Result'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRegenerate}
                disabled={isGenerating || isSaving}
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isGenerating || isSaving}
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
              <label className="block text-sm font-medium text-gray-700">Preview:</label>
              <div className="w-full rounded-lg overflow-hidden bg-gray-100 p-4">
                <audio controls className="w-full" src={currentResult.audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </>
        )}

        {/* Input Section */}
        {!hasResult && (
          <>
            <VoiceSelector
              value={voiceId}
              onChange={setVoiceId}
              disabled={isGenerating}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                rows={6}
                maxLength={5000}
                disabled={isGenerating}
                className="input w-full resize-none"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Maximum 5000 characters</span>
                <span>{text.length} / 5000</span>
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <button
                type="button"
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span>Advanced Settings</span>
                <ChevronDownIcon
                  className={`h-5 w-5 transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isSettingsExpanded && (
                <div className="mt-3 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stability: {settings.stability?.toFixed(2) || '0.50'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.stability || 0.5}
                      onChange={(e) =>
                        setSettings({ ...settings, stability: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Controls voice stability. Lower values = more variation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Similarity Boost: {settings.similarityBoost?.toFixed(2) || '0.75'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.similarityBoost || 0.75}
                      onChange={(e) =>
                        setSettings({ ...settings, similarityBoost: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Controls how similar the voice is to the original.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style: {settings.style?.toFixed(2) || '0.00'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.style || 0.0}
                      onChange={(e) =>
                        setSettings({ ...settings, style: parseFloat(e.target.value) })
                      }
                      className="w-full"
                      disabled={settings.modelId !== 'eleven_multilingual_v2'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Controls expressiveness (Eleven v3 only).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <Select
                      value={settings.modelId || 'eleven_multilingual_v2'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          modelId: e.target.value as SpeechSettings['modelId'],
                        })
                      }
                      options={[
                        { value: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2' },
                        { value: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5' },
                        { value: 'eleven_monolingual_v1', label: 'Eleven Monolingual v1' },
                      ]}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useSpeakerBoost"
                      checked={settings.useSpeakerBoost ?? true}
                      onChange={(e) =>
                        setSettings({ ...settings, useSpeakerBoost: e.target.checked })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useSpeakerBoost" className="ml-2 text-sm text-gray-700">
                      Use Speaker Boost
                    </label>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

