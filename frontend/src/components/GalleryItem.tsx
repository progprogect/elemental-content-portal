import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EllipsisVerticalIcon, CalendarIcon, TagIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { GalleryItem as GalleryItemType } from '../services/api/gallery'

interface GalleryItemProps {
  item: GalleryItemType
  onView: (item: GalleryItemType) => void
  onDelete?: (item: GalleryItemType) => void
  onDownload?: (item: GalleryItemType) => void
}

export default function GalleryItem({ item, onView, onDelete, onDownload }: GalleryItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Закрытие меню при клике вне его
  useEffect(() => {
    if (isMenuOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
            buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsMenuOpen(false)
          setMenuPosition(null)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    } else {
      setMenuPosition(null)
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

  const handleCardClick = () => {
    if (!isMenuOpen) {
      onView(item)
    }
  }

  // Определяем тип медиа только по расширению файла в URL
  const detectMediaType = (url: string): 'image' | 'video' | 'file' => {
    if (!url || url.length === 0) {
      return 'file'
    }
    
    // Если бэкенд уже определил тип и это не 'file', используем его
    // (бэкенд проверяет по расширению в assetPath или URL)
    if (item.mediaType && item.mediaType !== 'file') {
      return item.mediaType
    }
    
    // Пытаемся определить по расширению файла в URL
    const urlLower = url.toLowerCase()
    
    // Убираем query параметры для проверки расширения
    const urlWithoutQuery = urlLower.split('?')[0].split('#')[0]
    
    // Проверка расширения изображений
    if (urlWithoutQuery.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|jfif|heic|heif)$/i)) {
      return 'image'
    }
    
    // Проверка расширения видео
    if (urlWithoutQuery.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v|3gp|ogv|mpg|mpeg)$/i)) {
      return 'video'
    }
    
    // Если расширения нет, проверяем по паттернам в URL (для случаев когда файл без расширения)
    // Но только если это явные паттерны типа /image/ или /video/
    if (urlLower.includes('/image/') || urlLower.includes('/img/') || urlLower.includes('/photo/')) {
      return 'image'
    }
    
    if (urlLower.includes('/video/') || urlLower.includes('/vid/') || urlLower.includes('/movie/')) {
      return 'video'
    }
    
    // Если ничего не подошло - возвращаем 'file'
    return 'file'
  }

  const displayMediaType = detectMediaType(item.mediaUrl)
  
  // Отладочная информация (можно убрать в продакшене)
  if (import.meta.env.DEV) {
    console.log('GalleryItem:', {
      id: item.id,
      mediaUrl: item.mediaUrl,
      filename: item.filename,
      backendMediaType: item.mediaType,
      detectedMediaType: displayMediaType,
    })
  }

  return (
    <div
      className="relative group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowMetadata(true)}
      onMouseLeave={() => {
        setShowMetadata(false)
        setIsMenuOpen(false)
        setMenuPosition(null)
      }}
    >
      {/* Media Preview */}
      <div 
        className="aspect-square w-full overflow-hidden bg-gray-100 cursor-pointer"
        onClick={handleCardClick}
      >
        {displayMediaType === 'image' ? (
          <>
            <img
              src={item.mediaUrl}
              alt={item.filename || 'Preview'}
              className="w-full h-full object-contain"
              loading="lazy"
              onError={(e) => {
                console.error('Image load error:', item.mediaUrl, e)
                const target = e.target as HTMLImageElement
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-gray-200"><svg class="h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><a href="' + item.mediaUrl + '" target="_blank" rel="noopener noreferrer" class="text-xs text-primary-600 hover:underline">Open in new tab</a></div>'
                }
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', item.mediaUrl)
              }}
            />
            {/* Fallback для случаев когда изображение не загружается */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none">
              <a
                href={item.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open in new tab
              </a>
            </div>
          </>
        ) : displayMediaType === 'video' ? (
          <video
            src={item.mediaUrl}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
            onError={(e) => {
              const target = e.target as HTMLVideoElement
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-50"><svg class="h-16 w-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div>'
              }
            }}
          />
        ) : (
          // Для файлов без расширения попробуем показать как изображение или видео
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
            {item.mediaUrl && (
              <a
                href={item.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(item.mediaUrl, '_blank')
                }}
                className="text-xs text-primary-600 hover:underline"
              >
                Open file
              </a>
            )}
          </div>
        )}
      </div>

      {/* Metadata Overlay */}
      {showMetadata && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-between p-3 text-white pointer-events-none">
          <div className="flex justify-between items-start pointer-events-auto">
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
            <div className="relative ml-2 z-[100]" ref={menuRef}>
              <button
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation()
                  if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect()
                    setMenuPosition({
                      top: rect.bottom + 4,
                      right: window.innerWidth - rect.right,
                    })
                  }
                  setIsMenuOpen(!isMenuOpen)
                }}
                className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors pointer-events-auto"
                aria-label="Options"
              >
                <EllipsisVerticalIcon className="h-4 w-4" />
              </button>
              {isMenuOpen && menuPosition && (
                <>
                  {/* Overlay to close menu on outside click */}
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setMenuPosition(null)
                    }}
                  />
                  <div
                    className="fixed w-48 bg-white rounded-md shadow-lg z-[9999] border border-gray-200"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      top: `${menuPosition.top}px`,
                      right: `${menuPosition.right}px`,
                    }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onView(item)
                          setIsMenuOpen(false)
                          setMenuPosition(null)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        View
                      </button>
                      {item.task && (
                        <button
                          onClick={() => {
                            handleViewTask()
                            setMenuPosition(null)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View Task
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleDownload()
                          setMenuPosition(null)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Download
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => {
                            handleDelete()
                            setMenuPosition(null)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </>
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


