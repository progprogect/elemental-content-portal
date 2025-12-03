import { useState } from 'react'
import { Task, Platform } from '../services/api/tasks'
import PublicationCard from './PublicationCard'

interface ExpandableTaskRowProps {
  task: Task
  platforms: Platform[]
  columnsCount: number
  onEdit?: (publicationId: string) => void
  onDelete?: (publicationId: string) => void
  onTaskView?: () => void
  onTaskDelete?: () => void
  formatDate: (dateString: string) => string
}

export default function ExpandableTaskRow({
  task,
  platforms,
  columnsCount,
  onEdit,
  onDelete,
  onTaskView,
  onTaskDelete,
  formatDate,
}: ExpandableTaskRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const publications = task.publications || []

  const getPlatform = (platformCode: string) => {
    return platforms.find(p => p.code === platformCode)
  }

  return (
    <>
      <tr 
        className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
      >
        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200 text-sm text-gray-600">
          {formatDate(task.scheduledDate)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {publications.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div className="text-sm font-medium text-gray-900">{task.title}</div>
          </div>
          {task.list && (
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              {task.list.icon && <span>{task.list.icon}</span>}
              <span>{task.list.name}</span>
            </div>
          )}
          {publications.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {publications.length} {publications.length === 1 ? 'publication' : 'publications'}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-700 font-medium">{task.contentType}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            task.status === 'completed' ? 'bg-green-100 text-green-800' :
            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            task.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {task.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {new Date(task.createdAt).toLocaleDateString()}
        </td>
        {/* Empty cells for table columns */}
        {Array.from({ length: columnsCount }).map((_, idx) => (
          <td key={idx} className="px-6 py-4 min-w-[200px] max-w-[400px]">
            <div className="text-sm text-gray-400">-</div>
          </td>
        ))}
        {/* Empty cell for Add Column button */}
        <td className="px-6 py-4 min-w-[200px] bg-gray-50 border-r border-gray-200"></td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-gray-50 border-l-2 border-gray-300">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onTaskView}
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              View
            </button>
            <button
              onClick={onTaskDelete}
              className="text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && publications.length > 0 && (
        <tr>
          <td colSpan={5 + columnsCount + 2} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Publications:</h4>
              {publications.map((publication) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  platform={getPlatform(publication.platform)}
                  compact
                  onEdit={onEdit ? () => onEdit(publication.id) : undefined}
                  onDelete={onDelete ? () => onDelete(publication.id) : undefined}
                />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

