import { useState, useEffect, useCallback } from 'react'
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { StockMediaItem } from '../services/api/stock-media'
import Button from './ui/Button'

interface StockMediaLightboxProps {
  items: StockMediaItem[]
  currentIndex: number
  onClose: () => void
  onAddToGallery: (item: StockMediaItem) => void
  isAdding?: boolean
}

export default function StockMediaLightbox({
  items,
  currentIndex: initialIndex,
  onClose,
  onAddToGallery,
  isAdding = false,
}: StockMediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setImageError(false)
    setVideoError(false)
  }, [initialIndex])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
    setImageError(false)
    setVideoError(false)
  }, [items.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
    setImageError(false)
    setVideoError(false)
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

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'pexels':
        return 'Pexels'
      case 'unsplash':
        return 'Unsplash'
      case 'pixabay':
        return 'Pixabay'
      default:
        return source
    }
  }

  const isPhoto = currentItem.type === 'photo'
  const mediaUrl = isPhoto ? (currentItem.downloadUrl || currentItem.url) : currentItem.downloadUrl || currentItem.url

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full p-4 flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
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
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-gray-800 rounded-lg p-4">
          <div className="flex-1 flex items-center justify-center min-h-0 w-full">
            {isPhoto ? (
              <>
                {!imageError ? (
                  <img
                    src={mediaUrl}
                    alt={currentItem.description || 'Stock media'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-white rounded-lg">
                    <p className="text-lg">Failed to load image</p>
                    {currentItem.url && (
                      <a
                        href={currentItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-primary-400 hover:underline"
                      >
                        Open in new tab
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {!videoError ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="max-w-full max-h-[70vh] rounded-lg"
                    onError={() => setVideoError(true)}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-white rounded-lg">
                    <PlayIcon className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-lg">Failed to load video</p>
                    {currentItem.url && (
                      <a
                        href={currentItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-primary-400 hover:underline"
                      >
                        Open in new tab
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Metadata Sidebar */}
        <div className="w-full md:w-80 bg-gray-900 p-4 rounded-lg md:ml-4 mt-4 md:mt-0 flex-shrink-0 overflow-y-auto">
          <h3 className="text-xl font-semibold text-white mb-4">Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">SOURCE</p>
              <p className="text-white font-medium">{getSourceLabel(currentItem.source)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">TYPE</p>
              <p className="text-white font-medium capitalize">{currentItem.type}</p>
            </div>
            {currentItem.width && currentItem.height && (
              <div>
                <p className="text-sm text-gray-400">DIMENSIONS</p>
                <p className="text-white font-medium">{currentItem.width} × {currentItem.height}</p>
              </div>
            )}
            {currentItem.duration && (
              <div>
                <p className="text-sm text-gray-400">DURATION</p>
                <p className="text-white font-medium">{Math.floor(currentItem.duration)}s</p>
              </div>
            )}
            {currentItem.photographer && (
              <div>
                <p className="text-sm text-gray-400">PHOTOGRAPHER</p>
                <p className="text-white font-medium">{currentItem.photographer}</p>
                {currentItem.photographerUrl && (
                  <a
                    href={currentItem.photographerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:underline text-sm"
                  >
                    View profile
                  </a>
                )}
              </div>
            )}
            {currentItem.description && (
              <div>
                <p className="text-sm text-gray-400">DESCRIPTION</p>
                <p className="text-white font-medium">{currentItem.description}</p>
              </div>
            )}
            {currentItem.tags && currentItem.tags.length > 0 && (
              <div>
                <p className="text-sm text-gray-400">TAGS</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentItem.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-700 text-white text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <Button
              variant="primary"
              onClick={() => onAddToGallery(currentItem)}
              disabled={isAdding}
              className="w-full justify-center"
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add to Gallery
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

