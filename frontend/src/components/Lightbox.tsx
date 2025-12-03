import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface MediaItem {
  url: string
  filename?: string
}

interface LightboxProps {
  media: MediaItem[]
  currentIndex: number
  onClose: () => void
}

export default function Lightbox({ media, currentIndex: initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1))
  }, [media.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0))
  }, [media.length])

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

  if (!media || media.length === 0) {
    return null
  }

  const currentMedia = media[currentIndex]
  if (!currentMedia) {
    return null
  }

  const isImage = currentMedia.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const isVideo = currentMedia.url.match(/\.(mp4|mov|avi|webm)$/i)

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Close"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>

        {/* Navigation Buttons */}
        {media.length > 1 && (
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
        <div className="flex flex-col items-center">
          {isImage ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.filename || 'Image'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          ) : isVideo ? (
            <video
              src={currentMedia.url}
              controls
              className="max-w-full max-h-[90vh] rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-white text-center">
              <p className="text-lg mb-4">{currentMedia.filename || 'File'}</p>
              <a
                href={currentMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 underline"
              >
                Открыть файл
              </a>
            </div>
          )}

          {/* Media Counter */}
          {media.length > 1 && (
            <div className="mt-4 text-white text-sm">
              {currentIndex + 1} / {media.length}
            </div>
          )}

          {/* Filename */}
          {currentMedia.filename && (
            <div className="mt-2 text-white text-sm text-center max-w-2xl">
              {currentMedia.filename}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

