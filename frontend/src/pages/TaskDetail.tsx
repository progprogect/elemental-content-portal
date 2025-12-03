import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, resultsApi, promptsApi, TaskResult } from '../services/api/tasks'
import { useExtension } from '../hooks/useExtension'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import FileUpload from '../components/FileUpload'
import MediaPreview from '../components/MediaPreview'

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [resultUrl, setResultUrl] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ path: string; url: string } | null>(null)
  const { isInstalled, prepareHaygenGeneration } = useExtension()

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id!),
    enabled: !!id,
  })

  const { data: promptData, isLoading: isLoadingPrompt } = useQuery({
    queryKey: ['prompt', id],
    queryFn: () => promptsApi.generatePrompt(id!),
    enabled: !!id && isPromptModalOpen,
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
    }) => resultsApi.addResult(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      setIsResultModalOpen(false)
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

  // Listen for results from extension
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'HAYGEN_RESULT' && event.data.payload.taskId === id) {
        const result = event.data.payload
        await addResultMutation.mutateAsync({
          resultUrl: result.resultUrl,
          downloadUrl: result.downloadUrl,
          source: 'haygen',
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
          <div className="mt-2 flex gap-2">
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
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Fields</h3>
        {task.fields.length === 0 ? (
          <p className="text-gray-500">No fields added</p>
        ) : (
          <div className="space-y-3">
            {task.fields.map((field) => (
              <div key={field.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{field.fieldName}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Type: {field.fieldType}
                    </div>
                    {field.fieldType === 'text' && (
                      <div className="text-sm text-gray-700 mt-1">
                        {field.fieldValue?.value || 'No value'}
                      </div>
                    )}
                    {field.fieldType === 'url' && field.fieldValue?.value && (
                      <a
                        href={field.fieldValue.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline mt-1"
                      >
                        {field.fieldValue.value}
                      </a>
                    )}
                    {field.fieldType === 'checkbox' && (
                      <div className="text-sm text-gray-700 mt-1">
                        {field.fieldValue?.checked ? '✓ Checked' : '☐ Unchecked'}
                      </div>
                    )}
                    {field.fieldType === 'file' && field.fieldValue?.url && (
                      <div className="mt-2">
                        <MediaPreview
                          url={field.fieldValue.url}
                          filename={field.fieldValue.filename}
                          className="w-full h-48"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={async () => {
              if (isInstalled && promptData) {
                // Prepare extension with data
                const success = await prepareHaygenGeneration(
                  id!,
                  promptData.prompt,
                  promptData.assets
                )
                if (success) {
                  // Open Haygen
                  window.open('https://haygen.com/create', '_blank')
                } else {
                  // Fallback: show prompt modal
                  setIsPromptModalOpen(true)
                }
              } else {
                // Show prompt modal if extension not installed
                setIsPromptModalOpen(true)
              }
            }}
          >
            Generate Content
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsResultModalOpen(true)}
          >
            Add Result Manually
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Results</h3>
        {task.results.length === 0 ? (
          <p className="text-gray-500">No results yet</p>
        ) : (
          <div className="space-y-3">
            {task.results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                onDelete={() => deleteResultMutation.mutate(result.id)}
              />
            ))}
          </div>
        )}
      </div>

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
