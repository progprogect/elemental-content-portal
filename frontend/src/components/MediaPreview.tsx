import { useState } from 'react'
import { PhotoIcon, VideoCameraIcon, DocumentIcon } from '@heroicons/react/24/outline'
import Lightbox from './Lightbox'

interface MediaPreviewProps {
  url: string
  filename?: string
  type?: 'image' | 'video' | 'file'
  className?: string
}

export default function MediaPreview({ url, filename, type, className = '' }: MediaPreviewProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Determine media type from URL or filename
  const getMediaType = (): 'image' | 'video' | 'file' => {
    if (type) return type
    
    const urlLower = url.toLowerCase()
    const filenameLower = filename?.toLowerCase() || ''
    
    if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || filenameLower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return 'image'
    }
    if (urlLower.match(/\.(mp4|mov|avi|webm)$/i) || filenameLower.match(/\.(mp4|mov|avi|webm)$/i)) {
      return 'video'
    }
    return 'file'
  }

  const mediaType = getMediaType()

  const handleClick = () => {
    if (mediaType === 'image' || mediaType === 'video') {
      setIsLightboxOpen(true)
    } else {
      window.open(url, '_blank')
    }
  }

  if (mediaType === 'image') {
    return (
      <>
        <div
          className={`relative cursor-pointer group overflow-hidden rounded-lg bg-gray-100 ${className}`}
          onClick={handleClick}
        >
          {!imageError ? (
            <img
              src={url}
              alt={filename || 'Preview'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <PhotoIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
              Нажмите для просмотра
            </span>
          </div>
        </div>
        {isLightboxOpen && (
          <Lightbox
            media={[{ url, filename }]}
            currentIndex={0}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </>
    )
  }

  if (mediaType === 'video') {
    return (
      <>
        <div
          className={`relative cursor-pointer group overflow-hidden rounded-lg bg-gray-100 ${className}`}
          onClick={handleClick}
        >
          <div className="w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-50">
            <VideoCameraIcon className="h-16 w-16 text-white" />
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
              Нажмите для просмотра
            </span>
          </div>
        </div>
        {isLightboxOpen && (
          <Lightbox
            media={[{ url, filename }]}
            currentIndex={0}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </>
    )
  }

  // File type (PDF, etc.)
  return (
    <div
      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={handleClick}
    >
      <DocumentIcon className="h-8 w-8 text-gray-400" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {filename || 'File'}
        </div>
        <div className="text-xs text-gray-500">Нажмите для открытия</div>
      </div>
    </div>
  )
}


