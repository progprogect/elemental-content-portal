import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EllipsisVerticalIcon, CalendarIcon, TagIcon } from '@heroicons/react/24/outline'
import { GalleryItem as GalleryItemType } from '../services/api/gallery'
import MediaPreview from './MediaPreview'

interface GalleryItemProps {
  item: GalleryItemType
  onView: (item: GalleryItemType) => void
  onDelete?: (item: GalleryItemType) => void
  onDownload?: (item: GalleryItemType) => void
}

export default function GalleryItem({ item, onView, onDelete, onDownload }: GalleryItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'haygen':
        return 'Haygen'
      case 'nanobanana':
        return 'NanoBanana'
      case 'manual':
        return 'Manual'
      default:
        return source
    }
  }

  const handleViewTask = () => {
    if (item.task) {
      navigate(`/tasks/${item.task.id}`)
    }
    setIsMenuOpen(false)
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(item)
    } else {
      // Fallback: открыть URL для скачивания
      const downloadUrl = item.downloadUrl || item.assetUrl || item.mediaUrl
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    }
    setIsMenuOpen(false)
  }

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this item?')) {
      onDelete(item)
    }
    setIsMenuOpen(false)
  }

  return (
    <div
      className="relative group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowMetadata(true)}
      onMouseLeave={() => setShowMetadata(false)}
    >
      {/* Media Preview */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <MediaPreview
          url={item.mediaUrl}
          filename={item.filename}
          type={item.mediaType}
          className="w-full h-full"
        />
      </div>

      {/* Metadata Overlay */}
      {showMetadata && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-between p-3 text-white">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              {item.task && (
                <div className="text-sm font-medium truncate mb-1" title={item.task.title}>
                  {item.task.title}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <CalendarIcon className="h-3 w-3" />
                <span>{formatDate(item.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                <TagIcon className="h-3 w-3" />
                <span>{getSourceLabel(item.source)}</span>
              </div>
            </div>
            <div className="relative ml-2" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMenuOpen(!isMenuOpen)
                }}
                className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                aria-label="Options"
              >
                <EllipsisVerticalIcon className="h-4 w-4" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onView(item)
                        setIsMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      View
                    </button>
                    {item.task && (
                      <button
                        onClick={handleViewTask}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        View Task
                      </button>
                    )}
                    <button
                      onClick={handleDownload}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Download
                    </button>
                    {onDelete && (
                      <button
                        onClick={handleDelete}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom metadata bar (always visible on mobile) */}
      <div className="p-2 bg-white border-t border-gray-100 md:hidden">
        {item.task && (
          <div className="text-xs font-medium text-gray-900 truncate mb-1">
            {item.task.title}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(item.createdAt)}</span>
          <span>{getSourceLabel(item.source)}</span>
        </div>
      </div>
    </div>
  )
}

