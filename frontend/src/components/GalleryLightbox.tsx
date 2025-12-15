import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { GalleryItem } from '../services/api/gallery'
import Button from './ui/Button'

interface GalleryLightboxProps {
  items: GalleryItem[]
  currentIndex: number
  onClose: () => void
  onDelete?: (item: GalleryItem) => void
  onDownload?: (item: GalleryItem) => void
}

export default function GalleryLightbox({
  items,
  currentIndex: initialIndex,
  onClose,
  onDelete,
  onDownload,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const navigate = useNavigate()

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
  }, [items.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
  }, [items.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrevious, handleNext])

  if (!items || items.length === 0) {
    return null
  }

  const currentItem = items[currentIndex]
  if (!currentItem) {
    return null
  }

  const isImage = currentItem.mediaType === 'image'
  const isVideo = currentItem.mediaType === 'video'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
    if (currentItem.task) {
      navigate(`/tasks/${currentItem.task.id}`)
      onClose()
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentItem)
    } else {
      const downloadUrl = currentItem.downloadUrl || currentItem.assetUrl || currentItem.mediaUrl
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    }
  }

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this item?')) {
      onDelete(currentItem)
      if (items.length === 1) {
        onClose()
      } else {
        handleNext()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Close"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>

        {/* Navigation Buttons */}
        {items.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="h-10 w-10" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Next"
            >
              <ChevronRightIcon className="h-10 w-10" />
            </button>
          </>
        )}

        {/* Media Content */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="flex-1 flex items-center justify-center min-h-0 w-full">
            {isImage ? (
              <img
                src={currentItem.mediaUrl}
                alt={currentItem.filename || 'Image'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : isVideo ? (
              <video
                src={currentItem.mediaUrl}
                controls
                className="max-w-full max-h-[70vh] rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="text-white text-center">
                <p className="text-lg mb-4">{currentItem.filename || 'File'}</p>
                <a
                  href={currentItem.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 underline"
                >
                  Open file
                </a>
              </div>
            )}
          </div>

          {/* Media Counter */}
          {items.length > 1 && (
            <div className="mt-4 text-white text-sm">
              {currentIndex + 1} / {items.length}
            </div>
          )}
        </div>

        {/* Metadata Panel */}
        <div className="mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Basic Info */}
            <div className="space-y-2">
              {currentItem.task && (
                <div>
                  <div className="text-xs text-gray-300 uppercase mb-1">Task</div>
                  <div className="font-medium">{currentItem.task.title}</div>
                  <div className="text-sm text-gray-300">{currentItem.task.contentType}</div>
                </div>
              )}
              {currentItem.publication && (
                <div>
                  <div className="text-xs text-gray-300 uppercase mb-1">Publication</div>
                  <div className="font-medium">{currentItem.publication.platform}</div>
                  <div className="text-sm text-gray-300">{currentItem.publication.contentType}</div>
                </div>
              )}
            </div>

            {/* Right Column - Metadata */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-300" />
                <div>
                  <div className="text-xs text-gray-300 uppercase">Created</div>
                  <div className="text-sm">{formatDate(currentItem.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-gray-300" />
                <div>
                  <div className="text-xs text-gray-300 uppercase">Source</div>
                  <div className="text-sm">{getSourceLabel(currentItem.source)}</div>
                </div>
              </div>
              {currentItem.filename && (
                <div>
                  <div className="text-xs text-gray-300 uppercase">Filename</div>
                  <div className="text-sm truncate">{currentItem.filename}</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-white border-opacity-20">
            {currentItem.task && (
              <Button
                variant="secondary"
                onClick={handleViewTask}
                className="text-sm px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-0"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 inline mr-1" />
                View Task
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleDownload}
              className="text-sm px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-0"
            >
              <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
              Download
            </Button>
            {onDelete && (
              <Button
                variant="danger"
                onClick={handleDelete}
                className="text-sm px-3 py-1.5 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white border-0"
              >
                <TrashIcon className="h-4 w-4 inline mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

