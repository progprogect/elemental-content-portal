import { useState, useEffect } from 'react'
import { TaskPublication, Platform, CreatePublicationData, UpdatePublicationData } from '../services/api/tasks'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Select from './ui/Select'
import Button from './ui/Button'
import MarkdownEditor from './MarkdownEditor'
import { getErrorMessage } from '../utils/error-handler'

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'text', label: 'Text' },
  { value: 'presentation', label: 'Presentation' },
]

const EXECUTION_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'generated', label: 'AI Generated' },
]

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

interface PublicationEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreatePublicationData | UpdatePublicationData) => Promise<void>
  publication?: TaskPublication
  platform?: Platform
  platforms?: Platform[]
}

export default function PublicationEditor({
  isOpen,
  onClose,
  onSave,
  publication,
  platform,
  platforms = [],
}: PublicationEditorProps) {
  const [platformCode, setPlatformCode] = useState(publication?.platform || platform?.code || '')
  const [contentType, setContentType] = useState(publication?.contentType || 'video')
  const [executionType, setExecutionType] = useState<'manual' | 'generated'>(publication?.executionType || 'manual')
  const [status, setStatus] = useState<'draft' | 'in_progress' | 'completed' | 'failed'>(publication?.status || 'draft')
  const [note, setNote] = useState(publication?.note || '')
  const [content, setContent] = useState(publication?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (publication) {
        setPlatformCode(publication.platform)
        setContentType(publication.contentType)
        setExecutionType(publication.executionType)
        setStatus(publication.status)
        setNote(publication.note || '')
        setContent(publication.content || '')
      } else if (platform) {
        setPlatformCode(platform.code)
        setContentType('video')
        setExecutionType('manual')
        setStatus('draft')
        setNote('')
        setContent('')
      }
    } else {
      // Reset when modal closes
      setPlatformCode('')
      setContentType('video')
      setExecutionType('manual')
      setStatus('draft')
      setNote('')
      setContent('')
      setError(null)
    }
  }, [publication, platform, isOpen])

  const handleSave = async () => {
    setError(null)
    
    if (!platformCode) {
      setError('Platform is required')
      return
    }

    if (!contentType) {
      setError('Content type is required')
      return
    }

    setIsSaving(true)
    try {
      const data: CreatePublicationData | UpdatePublicationData = {
        platform: platformCode,
        contentType,
        executionType,
        status,
        note: note || null,
        content: content || null,
      }
      await onSave(data)
      onClose()
      // Reset form
      if (!publication) {
        setPlatformCode('')
        setContentType('video')
        setExecutionType('manual')
        setStatus('draft')
        setNote('')
        setContent('')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPlatform = platforms.find(p => p.code === platformCode) || platform

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={publication ? 'Edit Publication' : 'Create Publication'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving} className="ml-3">
            {isSaving ? 'Saving...' : 'Save'}
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

        {/* Platform (readonly if editing or platform provided) */}
        {publication || platform ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedPlatform?.icon || '📱'}</span>
                <span className="font-medium text-gray-900">{selectedPlatform?.name || platformCode}</span>
              </div>
            </div>
          </div>
        ) : (
          <Select
            label="Platform"
            value={platformCode}
            onChange={(e) => setPlatformCode(e.target.value)}
            options={platforms.map(p => ({ value: p.code, label: `${p.icon || ''} ${p.name}`.trim() }))}
            required
          />
        )}

        <Select
          label="Content Type"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          options={CONTENT_TYPES}
          required
        />

        <Select
          label="Execution Type"
          value={executionType}
          onChange={(e) => setExecutionType(e.target.value as 'manual' | 'generated')}
          options={EXECUTION_TYPES}
        />

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'in_progress' | 'completed' | 'failed')}
          options={STATUSES}
        />

        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this publication..."
        />

        <MarkdownEditor
          label="Content (optional)"
          value={content}
          onChange={(value) => setContent(value || '')}
          placeholder="Enter markdown content for this publication..."
        />
      </div>
    </Modal>
  )
}

