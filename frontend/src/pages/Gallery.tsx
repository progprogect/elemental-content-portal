import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryApi, GalleryItem, GalleryFilters as GalleryFiltersType } from '../services/api/gallery'
import { resultsApi } from '../services/api/tasks'
import GalleryFilters from '../components/GalleryFilters'
import GalleryGrid from '../components/GalleryGrid'
import GalleryLightbox from '../components/GalleryLightbox'
import Button from '../components/ui/Button'

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const hasAppliedStateFilters = useRef(false)

  // Получаем фильтры из URL
  const getFiltersFromUrl = (): GalleryFiltersType => {
    return {
      type: (searchParams.get('type') || 'all') as 'all' | 'image' | 'video',
      source: (searchParams.get('source') || 'all') as 'all' | 'manual' | 'haygen' | 'nanobanana',
      taskId: searchParams.get('taskId') || undefined,
      publicationId: searchParams.get('publicationId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 24,
      sort: (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'task',
    }
  }

  const filters = getFiltersFromUrl()

  // Загрузка данных галереи
  const { data, isLoading, error } = useQuery({
    queryKey: ['gallery', filters],
    queryFn: () => galleryApi.getGallery(filters),
  })

  // Проверяем, есть ли фильтры из location.state (для навигации из TaskDetail)
  useEffect(() => {
    // Сбрасываем флаг если location.state стал undefined
    if (!location.state?.galleryFilters) {
      hasAppliedStateFilters.current = false
      return
    }

    if (!hasAppliedStateFilters.current) {
      const stateFilters = location.state.galleryFilters as Partial<GalleryFiltersType>
      const newParams = new URLSearchParams(searchParams)
      
      Object.entries(stateFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all' && value !== 'newest') {
          newParams.set(key, String(value))
        } else {
          newParams.delete(key)
        }
      })
      
      // Применяем фильтры через setSearchParams и очищаем state
      setSearchParams(newParams, { replace: true })
      window.history.replaceState({}, document.title)
      hasAppliedStateFilters.current = true
    }
  }, [location.state, setSearchParams])

  // Удаление результата
  const deleteResultMutation = useMutation({
    mutationFn: async (item: GalleryItem) => {
      if (!item.task) {
        throw new Error('Cannot delete item without task')
      }
      // Находим taskId из item.task.id
      await resultsApi.deleteResult(item.task.id, item.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleItemView = (item: GalleryItem) => {
    const index = data?.items.findIndex((i) => i.id === item.id) ?? -1
    if (index >= 0) {
      setSelectedItemIndex(index)
      setLightboxOpen(true)
    }
  }

  const handleItemDelete = async (item: GalleryItem) => {
    try {
      await deleteResultMutation.mutateAsync(item)
    } catch (error: any) {
      console.error('Failed to delete item:', error)
      alert(error.response?.data?.error || 'Failed to delete item')
    }
  }

  const handleItemDownload = (item: GalleryItem) => {
    const downloadUrl = item.downloadUrl || item.assetUrl || item.mediaUrl
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  const handleCloseLightbox = () => {
    setLightboxOpen(false)
    setSelectedItemIndex(null)
  }

  const handleNextPage = () => {
    const newParams = new URLSearchParams(searchParams)
    const currentPage = parseInt(newParams.get('page') || '1', 10)
    newParams.set('page', String(currentPage + 1))
    setSearchParams(newParams)
  }

  const handlePreviousPage = () => {
    const newParams = new URLSearchParams(searchParams)
    const currentPage = parseInt(newParams.get('page') || '1', 10)
    if (currentPage > 1) {
      newParams.set('page', String(currentPage - 1))
      setSearchParams(newParams)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 skeleton w-48"></div>
        <div className="card">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square skeleton rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <p className="text-lg">Error loading gallery</p>
        <p className="text-sm mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  const items = data?.items || []
  const pagination = data?.pagination

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gallery</h2>
        {pagination && pagination.total > 0 && (
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
        )}
      </div>

      <GalleryFilters />

      <GalleryGrid
        items={items}
        onItemView={handleItemView}
        onItemDelete={handleItemDelete}
        onItemDownload={handleItemDownload}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            disabled={pagination.page === 1}
            onClick={handlePreviousPage}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={pagination.page === pagination.totalPages}
            onClick={handleNextPage}
          >
            Next
          </Button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && selectedItemIndex !== null && items.length > 0 && (
        <GalleryLightbox
          items={items}
          currentIndex={selectedItemIndex}
          onClose={handleCloseLightbox}
          onDelete={handleItemDelete}
          onDownload={handleItemDownload}
        />
      )}
    </div>
  )
}

