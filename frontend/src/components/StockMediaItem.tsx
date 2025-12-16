import { useState } from 'react'
import { StockMediaItem as StockMediaItemType } from '../services/api/stock-media'
import { PlusIcon, PlayIcon } from '@heroicons/react/24/outline'

interface StockMediaItemProps {
  item: StockMediaItemType
  onView: (item: StockMediaItemType) => void
  onAddToGallery: (item: StockMediaItemType) => void
  isAdding?: boolean
}

export default function StockMediaItem({ item, onView, onAddToGallery, isAdding = false }: StockMediaItemProps) {
  const [imageError, setImageError] = useState(false)

  const handleCardClick = () => {
    onView(item)
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToGallery(item)
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

  return (
    <div className="relative group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Media Preview */}
      <div 
        className="aspect-square w-full overflow-hidden bg-gray-100 relative cursor-pointer"
        onClick={handleCardClick}
      >
        {item.type === 'photo' ? (
          <>
            {!imageError ? (
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.description || 'Stock photo'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full relative">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <PlayIcon className="h-16 w-16 text-white" />
              </div>
            )}
            {item.duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {Math.floor(item.duration)}s
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 rounded-full p-3">
                <PlayIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Overlay with Add button */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex flex-col items-center justify-center gap-2">
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary-600 hover:bg-primary-700 text-white w-full mx-4 px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              <>
                <PlusIcon className="h-5 w-5" />
                Add to Gallery
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="font-medium">{getSourceLabel(item.source)}</span>
          {item.width && item.height && (
            <span>{item.width} × {item.height}</span>
          )}
        </div>
        {item.photographer && (
          <div className="text-xs text-gray-600 truncate">
            {item.photographer}
          </div>
        )}
      </div>
    </div>
  )
}

