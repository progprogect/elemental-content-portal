import { useState, useEffect } from 'react'
import { TaskPublication, Platform, CreatePublicationData, UpdatePublicationData } from '../services/api/tasks'
import Input from './ui/Input'
import Select from './ui/Select'
import MarkdownEditor from './MarkdownEditor'
import Button from './ui/Button'
import TextGenerationModal from './TextGenerationModal'

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'ai_video', label: 'AI Video' },
  { value: 'image', label: 'Image' },
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'translate', label: 'Translate' },
  { value: 'text', label: 'Text' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
]

const STANDARD_CONTENT_TYPES = ['video', 'ai_video', 'image', 'talking_head', 'translate', 'text', 'presentation']

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

interface InlinePublicationEditorProps {
  platform: Platform
  publication?: TaskPublication
  defaultContentType?: string
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (data: CreatePublicationData | UpdatePublicationData) => void
  onDelete?: () => void
  canDelete?: boolean
  allowIndividualSave?: boolean // If false, hide Save/Reset buttons and auto-update on change
  taskId?: string
}

export default function InlinePublicationEditor({
  platform,
  publication,
  defaultContentType = 'video',
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  canDelete = true,
  allowIndividualSave = true,
  taskId,
}: InlinePublicationEditorProps) {
  const [contentType, setContentType] = useState(publication?.contentType || defaultContentType)
  const [customContentType, setCustomContentType] = useState('')
  const [executionType, setExecutionType] = useState<'manual' | 'generated'>(publication?.executionType || 'manual')
  const [status, setStatus] = useState<'draft' | 'in_progress' | 'completed' | 'failed'>(publication?.status || 'draft')
  const [note, setNote] = useState(publication?.note || '')
  const [content, setContent] = useState(publication?.content || '')
  const [isTextGenModalOpen, setIsTextGenModalOpen] = useState(false)

  // Sync state with publication prop changes
  // When allowIndividualSave is false, only sync on initial mount or when publication ID changes
  // to avoid overwriting user edits that are stored in parent state
  useEffect(() => {
    if (publication) {
      // Check if contentType is a standard type or custom
      if (STANDARD_CONTENT_TYPES.includes(publication.contentType)) {
        setContentType(publication.contentType)
        setCustomContentType('')
      } else {
        setContentType('other')
        setCustomContentType(publication.contentType)
      }
      setExecutionType(publication.executionType)
      setStatus(publication.status)
      setNote(publication.note || '')
      setContent(publication.content || '')
    } else {
      // Check if defaultContentType is standard or custom
      if (STANDARD_CONTENT_TYPES.includes(defaultContentType)) {
        setContentType(defaultContentType)
        setCustomContentType('')
      } else {
        setContentType('other')
        setCustomContentType(defaultContentType)
      }
      setExecutionType('manual')
      setStatus('draft')
      setNote('')
      setContent('')
    }
    // Sync only when publication ID changes (new publication loaded) or when individual save is allowed
    // This prevents overwriting user edits when parent state updates the same publication object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publication?.id, defaultContentType, allowIndividualSave ? publication : undefined])

  // Determine current final contentType for comparison
  const currentFinalContentType = contentType === 'other' ? customContentType : contentType
  const previousFinalContentType = publication?.contentType || defaultContentType

  // Check if custom content type is required but empty
  const isCustomContentTypeInvalid = contentType === 'other' && !customContentType.trim()

  const hasChanges = 
    (currentFinalContentType !== previousFinalContentType && !isCustomContentTypeInvalid) ||
    executionType !== (publication?.executionType || 'manual') ||
    status !== (publication?.status || 'draft') ||
    note !== (publication?.note || '') ||
    content !== (publication?.content || '')

  const getPublicationData = (): CreatePublicationData | UpdatePublicationData | null => {
    // Determine final contentType
    const finalContentType = contentType === 'other' ? customContentType : contentType
    
    if (contentType === 'other' && !customContentType.trim()) {
      // Don't save if custom type is empty
      return null
    }

    return {
      platform: platform.code,
      contentType: finalContentType,
      executionType,
      status,
      note: note || null,
      content: content || null,
    }
  }

  const handleSave = () => {
    const data = getPublicationData()
    if (data) {
      onUpdate(data)
    }
  }

  // Auto-update parent state when fields change if individual save is disabled
  useEffect(() => {
    if (!allowIndividualSave && isExpanded && !isCustomContentTypeInvalid && hasChanges) {
      const data = getPublicationData()
      if (data) {
        onUpdate(data)
      }
    }
    // Note: hasChanges is intentionally not in dependencies to avoid infinite loops
    // It's recalculated on each render, so the effect will run when actual field values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, customContentType, executionType, status, note, content, allowIndividualSave, isExpanded, isCustomContentTypeInvalid])

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header - always visible */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">{platform.icon || '📱'}</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{platform.name}</div>
            {publication && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{publication.contentType}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  publication.status === 'completed' ? 'bg-green-100 text-green-800' :
                  publication.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  publication.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {publication.status}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {publication.executionType === 'generated' ? 'AI' : 'Manual'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-primary-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select
                label="Content Type"
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value)
                  if (e.target.value !== 'other') {
                    setCustomContentType('')
                  }
                }}
                options={CONTENT_TYPES}
                required
              />
              {contentType === 'other' && (
                <div className="mt-2">
                  <Input
                    label="Custom Content Type"
                    value={customContentType}
                    onChange={(e) => setCustomContentType(e.target.value)}
                    placeholder="Enter custom content type..."
                    required
                  />
                </div>
              )}
            </div>
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
          </div>

          <Input
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this publication..."
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Content (optional)
              </label>
              {taskId && publication?.id && (
                <Button
                  variant="secondary"
                  onClick={() => setIsTextGenModalOpen(true)}
                  className="text-sm px-3 py-1"
                  type="button"
                >
                  Generate Text
                </Button>
              )}
            </div>
            <MarkdownEditor
              value={content}
              onChange={(value) => setContent(value || '')}
              placeholder="Enter markdown content for this publication..."
            />
          </div>

          {allowIndividualSave && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const resetContentType = publication?.contentType || defaultContentType
                  if (STANDARD_CONTENT_TYPES.includes(resetContentType)) {
                    setContentType(resetContentType)
                    setCustomContentType('')
                  } else {
                    setContentType('other')
                    setCustomContentType(resetContentType)
                  }
                  setExecutionType(publication?.executionType || 'manual')
                  setStatus(publication?.status || 'draft')
                  setNote(publication?.note || '')
                  setContent(publication?.content || '')
                }}
                disabled={!hasChanges}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || isCustomContentTypeInvalid}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Text Generation Modal */}
      {taskId && publication?.id && (
        <TextGenerationModal
          isOpen={isTextGenModalOpen}
          onClose={() => setIsTextGenModalOpen(false)}
          taskId={taskId}
          publicationId={publication.id}
          existingContent={content}
          onInsert={(newContent, action) => {
            if (action === 'replace') {
              setContent(newContent)
            } else {
              setContent((content || '') + '\n\n' + newContent)
            }
            setIsTextGenModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

