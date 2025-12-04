import { TaskPublication, Platform } from '../services/api/tasks'
import Button from './ui/Button'

interface PublicationCardProps {
  publication: TaskPublication
  platform?: Platform
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
}

export default function PublicationCard({
  publication,
  platform,
  onEdit,
  onDelete,
  compact = false,
}: PublicationCardProps) {
  const getPlatformIcon = (platformCode: string) => {
    const icons: Record<string, string> = {
      tiktok: '🎵',
      youtube: '▶️',
      instagram: '📷',
      facebook: '👥',
    }
    return icons[platformCode] || '📱'
  }

  const platformIcon = platform?.icon || getPlatformIcon(publication.platform)
  const platformName = platform?.name || publication.platform

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-xl">{platformIcon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">{platformName}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-600">{publication.contentType}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                publication.status === 'completed' ? 'bg-green-100 text-green-800' :
                publication.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                publication.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {publication.status}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-600">
                {publication.executionType === 'generated' ? 'AI' : 'Manual'}
              </span>
            </div>
            {publication.note && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {publication.note}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{platformIcon}</div>
          <div>
            <h4 className="font-semibold text-gray-900">{platformName}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{publication.contentType}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                publication.status === 'completed' ? 'bg-green-100 text-green-800' :
                publication.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                publication.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {publication.status}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {publication.executionType === 'generated' ? 'AI Generated' : 'Manual'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="secondary" onClick={onEdit} className="text-xs px-2 py-1">
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" onClick={onDelete} className="text-xs px-2 py-1">
              Delete
            </Button>
          )}
        </div>
      </div>
      {publication.note && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">{publication.note}</p>
        </div>
      )}
      {publication.content && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Content:</p>
          <div className="text-sm text-gray-700 line-clamp-2">
            {publication.content.replace(/[#*`]/g, '').substring(0, 100)}
            {publication.content.length > 100 && '...'}
          </div>
        </div>
      )}
      {publication.results && publication.results.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">
            Results: {publication.results.length}
          </p>
        </div>
      )}
    </div>
  )
}


