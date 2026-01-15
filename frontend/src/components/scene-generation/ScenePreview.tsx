import { useState } from 'react'
import Button from '../ui/Button'
import { ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline'

interface ScenePreviewProps {
  sceneId: string
  kind: string
  status: string
  progress: number
  renderedAssetUrl?: string | null
  onRegenerate?: () => void
  onEdit?: () => void
}

export default function ScenePreview({
  sceneId,
  kind,
  status,
  progress,
  renderedAssetUrl,
  onRegenerate,
  onEdit,
}: ScenePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsLoading(true)
      try {
        await onRegenerate()
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{sceneId}</h3>
          <p className="text-sm text-gray-500 capitalize">{kind}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            status === 'completed'
              ? 'bg-green-100 text-green-800'
              : status === 'processing'
              ? 'bg-blue-100 text-blue-800'
              : status === 'failed'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status}
        </span>
      </div>

      {status === 'processing' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {renderedAssetUrl && status === 'completed' && (
        <div className="mb-3">
          <video
            src={renderedAssetUrl}
            controls
            className="w-full rounded-md"
            style={{ maxHeight: '200px' }}
          />
        </div>
      )}

      {status === 'failed' && (
        <div className="mb-3 p-2 bg-red-50 rounded text-sm text-red-600">
          Scene rendering failed
        </div>
      )}

      <div className="flex gap-2">
        {onRegenerate && (
          <Button
            onClick={handleRegenerate}
            variant="ghost"
            disabled={isLoading || status === 'processing'}
            className="flex-1"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            {isLoading ? 'Regenerating...' : 'Regenerate'}
          </Button>
        )}
        {onEdit && status === 'completed' && (
          <Button onClick={onEdit} variant="ghost" className="flex-1">
            <PencilIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}

