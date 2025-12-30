import { TaskPublication, Platform } from '../services/api/tasks'
import { extractContentTitle } from '../utils/content-title'

interface PlatformPublicationCellProps {
  platform: Platform
  publication?: TaskPublication | null
  taskTitle?: string
  onClick?: () => void
}

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
} as const

export default function PlatformPublicationCell({
  platform,
  publication,
  taskTitle,
  onClick,
}: PlatformPublicationCellProps) {
  if (!publication) {
    return (
      <td className="px-4 py-3 border-l border-r border-gray-200 min-w-[180px] bg-white text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{platform.icon || '📱'}</span>
            <span className="text-xs font-semibold text-gray-700">{platform.name}</span>
          </div>
          <span className="text-gray-400 text-xs">—</span>
        </div>
      </td>
    )
  }

  const contentTitle = extractContentTitle(publication.content, publication.note, taskTitle)
  const statusColor = statusColors[publication.status as keyof typeof statusColors] || statusColors.draft

  return (
    <td
      className={`px-4 py-3 border-l border-r border-gray-200 min-w-[180px] bg-white ${
        onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="space-y-1">
        {/* Row 1: Icon + Platform name */}
        <div className="flex items-center gap-1.5">
          <span className="text-base">{platform.icon || '📱'}</span>
          <span className="text-xs font-semibold text-gray-900">
            {platform.name}
          </span>
        </div>
        
        {/* Row 2: Content title */}
        <div className="text-xs font-medium text-gray-900 line-clamp-1" title={contentTitle}>
          {contentTitle}
        </div>
        
        {/* Row 3: Content type + Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {publication.contentType}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor}`}>
            {publication.status}
          </span>
        </div>
      </div>
    </td>
  )
}

