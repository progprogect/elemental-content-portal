import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, resultsApi, promptsApi, platformsApi, publicationsApi, fieldsApi, TaskResult, TaskPublication, CreatePublicationData, UpdatePublicationData } from '../services/api/tasks'
import { useExtension } from '../hooks/useExtension'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import FileUpload from '../components/FileUpload'
import MediaPreview from '../components/MediaPreview'
import PublicationCard from '../components/PublicationCard'
import PublicationEditor from '../components/PublicationEditor'
import TableCellEditor from '../components/TableCellEditor'

// Utility function to format date for display
function formatDateLong(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
    const dateFormatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    return `${dayOfWeek}, ${dateFormatted}`
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Invalid date'
  }
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isPublicationEditorOpen, setIsPublicationEditorOpen] = useState(false)
  const [editingPublication, setEditingPublication] = useState<TaskPublication | undefined>(undefined)
  const [resultPublicationId, setResultPublicationId] = useState<string | undefined>(undefined)
  const [generatingPublicationId, setGeneratingPublicationId] = useState<string | undefined>(undefined)
  const [resultUrl, setResultUrl] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ path: string; url: string } | null>(null)
  const { prepareHaygenGeneration } = useExtension()

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id!, 'publications'),
    enabled: !!id,
  })

  // Get platforms
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: platformsApi.getPlatforms,
  })

  // Check if we need to open publication editor from navigation state
  useEffect(() => {
    const editPublicationId = location.state?.editPublicationId
    if (editPublicationId && task?.publications) {
      const publication = task.publications.find(p => p.id === editPublicationId)
      if (publication) {
        setEditingPublication(publication)
        setIsPublicationEditorOpen(true)
        // Clear state
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, task])

  // Prompt data for specific publication
  const { data: promptData, isLoading: isLoadingPrompt } = useQuery({
    queryKey: ['prompt', id, generatingPublicationId],
    queryFn: () => {
      if (generatingPublicationId) {
        return promptsApi.generatePromptForPublication(id!, generatingPublicationId)
      }
      return promptsApi.generatePrompt(id!)
    },
    enabled: !!id && (isPromptModalOpen || !!generatingPublicationId),
  })

  const deleteMutation = useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate('/')
    },
  })

  const addResultMutation = useMutation({
    mutationFn: (data: {
      resultUrl?: string
      downloadUrl?: string
      assetPath?: string
      assetUrl?: string
      source?: 'manual' | 'haygen' | 'nanobanana'
      publicationId?: string | null
    }) => resultsApi.addResult(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      setIsResultModalOpen(false)
      setResultPublicationId(undefined)
      setResultUrl('')
      setDownloadUrl('')
      setUploadedFile(null)
    },
  })

  const deleteResultMutation = useMutation({
    mutationFn: (resultId: string) => resultsApi.deleteResult(id!, resultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
    },
  })

  const createPublicationMutation = useMutation({
    mutationFn: (data: CreatePublicationData) => publicationsApi.createPublication(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      setIsPublicationEditorOpen(false)
      setEditingPublication(undefined)
    },
  })

  const updatePublicationMutation = useMutation({
    mutationFn: ({ publicationId, data }: { publicationId: string; data: UpdatePublicationData }) =>
      publicationsApi.updatePublication(id!, publicationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      setIsPublicationEditorOpen(false)
      setEditingPublication(undefined)
    },
  })

  const deletePublicationMutation = useMutation({
    mutationFn: (publicationId: string) => publicationsApi.deletePublication(id!, publicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
    },
  })

  // Listen for results from extension
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'HAYGEN_RESULT' && event.data.payload.taskId === id) {
        const result = event.data.payload
        await addResultMutation.mutateAsync({
          resultUrl: result.resultUrl,
          downloadUrl: result.downloadUrl,
          source: 'haygen',
          publicationId: result.publicationId || null, // Use publicationId from extension
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [id, addResultMutation])

  const handleAddResult = () => {
    addResultMutation.mutate({
      resultUrl: resultUrl || undefined,
      downloadUrl: downloadUrl || undefined,
      assetPath: uploadedFile?.path,
      assetUrl: uploadedFile?.url,
      source: 'manual',
      publicationId: resultPublicationId || null,
    })
  }

  const handleFileUpload = (file: { filename: string; path: string; url: string; size: number }) => {
    setUploadedFile({ path: file.path, url: file.url })
  }

  if (isLoading || !task) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-10 skeleton w-64"></div>
        <div className="card">
          <div className="h-6 skeleton w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{task.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              task.status === 'completed' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              task.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status}
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              {task.contentType}
            </span>
            <span className="text-sm text-gray-600">
              Scheduled: {formatDateLong(task.scheduledDate)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/tasks/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => deleteMutation.mutate(id!)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Fields */}
      {task.fields.length > 0 && (
        <div className="card mb-6">
          <div className="space-y-3">
            {task.fields.map((field) => (
              <div key={field.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-700 mb-2">{field.fieldName}</div>
                    {field.fieldType === 'file' ? (
                      <div>
                        {field.fieldValue?.url && (
                          <MediaPreview
                            url={field.fieldValue.url}
                            filename={field.fieldValue.filename}
                            className="w-full h-48"
                          />
                        )}
                      </div>
                    ) : (
                      <TableCellEditor
                        field={field}
                        onSave={async (fieldId, value) => {
                          try {
                            await fieldsApi.updateField(id!, fieldId, { fieldValue: value })
                            queryClient.invalidateQueries({ queryKey: ['task', id] })
                          } catch (error) {
                            console.error('Failed to update field:', error)
                            throw error
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications */}
      {platforms && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Publications</h3>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingPublication(undefined)
                setIsPublicationEditorOpen(true)
              }}
            >
              + Add Publication
            </Button>
          </div>
          {task.publications && task.publications.length > 0 ? (
            <div className="space-y-4">
              {task.publications.map((publication) => {
                const platform = platforms.find(p => p.code === publication.platform)
                const publicationResults = task.results?.filter(r => r.publicationId === publication.id) || []
                return (
                  <div key={publication.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <PublicationCard
                      publication={publication}
                      platform={platform}
                      onEdit={() => {
                        setEditingPublication(publication)
                        setIsPublicationEditorOpen(true)
                      }}
                      onDelete={() => {
                        if (window.confirm(`Delete publication for ${platform?.name || publication.platform}?`)) {
                          deletePublicationMutation.mutate(publication.id)
                        }
                      }}
                    />
                    
                    {/* Actions for this publication */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="primary"
                          className="text-sm px-3 py-1.5"
                          onClick={async () => {
                            setGeneratingPublicationId(publication.id)
                            try {
                              // Generate prompt for this publication
                              const promptData = await promptsApi.generatePromptForPublication(id!, publication.id)
                              
                              // Save data (via extension or sessionStorage)
                              const success = await prepareHaygenGeneration(
                                id!,
                                publication.id,
                                promptData.prompt,
                                promptData.assets
                              )
                              
                              if (success) {
                                // Direct redirect to Haygen
                                // Extension will automatically fill the data when page loads
                                window.open('https://app.heygen.com/video-agent', '_blank')
                              } else {
                                setIsPromptModalOpen(true)
                              }
                            } catch (error) {
                              console.error('Failed to generate prompt:', error)
                              setIsPromptModalOpen(true)
                            } finally {
                              setGeneratingPublicationId(undefined)
                            }
                          }}
                          disabled={isLoadingPrompt}
                        >
                          🎬 Generate Content
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-sm px-3 py-1.5"
                          onClick={() => {
                            setResultPublicationId(publication.id)
                            setIsResultModalOpen(true)
                          }}
                        >
                          ➕ Add Result
                        </Button>
                      </div>
                    </div>

                    {/* Results for this publication */}
                    {publicationResults.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Results ({publicationResults.length})
                        </p>
                        <div className="space-y-2">
                          {publicationResults.map((result) => (
                            <ResultCard
                              key={result.id}
                              result={result}
                              onDelete={() => deleteResultMutation.mutate(result.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500">No publications added yet</p>
          )}
        </div>
      )}

      {/* Publication Editor Modal */}
      {platforms && (
        <PublicationEditor
          isOpen={isPublicationEditorOpen}
          onClose={() => {
            setIsPublicationEditorOpen(false)
            setEditingPublication(undefined)
          }}
          onSave={async (data) => {
            if (editingPublication) {
              await updatePublicationMutation.mutateAsync({
                publicationId: editingPublication.id,
                data,
              })
            } else {
              if (!data.platform) {
                throw new Error('Platform is required')
              }
              await createPublicationMutation.mutateAsync({
                platform: data.platform,
                contentType: data.contentType || 'video',
                executionType: data.executionType || 'manual',
                status: data.status || 'draft',
                note: data.note || null,
                content: data.content || null,
              })
            }
          }}
          publication={editingPublication}
          platforms={platforms}
        />
      )}

      {/* Add Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => {
          setIsResultModalOpen(false)
          setResultUrl('')
          setDownloadUrl('')
          setUploadedFile(null)
        }}
        title="Add Result"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsResultModalOpen(false)
                setResultPublicationId(undefined)
                setResultUrl('')
                setDownloadUrl('')
                setUploadedFile(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddResult}
              disabled={addResultMutation.isPending || (!resultUrl && !downloadUrl && !uploadedFile)}
              className="ml-3"
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Result URL (optional)"
            type="url"
            value={resultUrl}
            onChange={(e) => setResultUrl(e.target.value)}
            placeholder="https://example.com/result"
          />
          <Input
            label="Download URL (optional)"
            type="url"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            placeholder="https://example.com/download"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File (optional)
            </label>
            <FileUpload
              onUploadComplete={handleFileUpload}
              accept="image/*,video/*,application/pdf"
            />
            {uploadedFile && (
              <div className="mt-2 text-sm text-green-600">
                File uploaded: {uploadedFile.url}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Generate Prompt Modal */}
      <Modal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        title="Generated Prompt"
        footer={
          <Button variant="primary" onClick={() => setIsPromptModalOpen(false)}>
            Close
          </Button>
        }
      >
        {isLoadingPrompt ? (
          <div className="text-center py-4">Generating prompt...</div>
        ) : promptData ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                readOnly
                value={promptData.prompt}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                rows={10}
              />
            </div>
            {promptData.assets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assets
                </label>
                <div className="space-y-2">
                  {promptData.assets.map((asset, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{asset.filename}</div>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {asset.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-sm text-gray-600">
              Copy the prompt and assets URLs to use with Haygen AI Content Creator
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-red-600">
            Failed to generate prompt
          </div>
        )}
      </Modal>
    </div>
  )
}

function ResultCard({ result, onDelete }: { result: TaskResult; onDelete: () => void }) {
  const mediaUrl = result.assetUrl || result.downloadUrl || result.resultUrl
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="text-sm text-gray-500">
            Source: {result.source} • {new Date(result.createdAt).toLocaleString()}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </div>
      {mediaUrl && (
        <div className="mb-2">
          <MediaPreview
            url={mediaUrl}
            filename={result.assetPath}
            className="w-full h-64"
          />
        </div>
      )}
      {result.resultUrl && !mediaUrl && (
        <div className="mb-2">
          <a
            href={result.resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline text-sm"
          >
            View Result
          </a>
        </div>
      )}
      {result.downloadUrl && !mediaUrl && (
        <div className="mb-2">
          <a
            href={result.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline text-sm"
          >
            Download
          </a>
        </div>
      )}
    </div>
  )
}
