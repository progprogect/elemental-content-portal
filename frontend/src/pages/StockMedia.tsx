import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockMediaApi, StockMediaItem, StockMediaSearchParams } from '../services/api/stock-media'
import StockMediaGrid from '../components/StockMediaGrid'
import StockMediaLightbox from '../components/StockMediaLightbox'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { MagnifyingGlassIcon, FunnelIcon, FilmIcon } from '@heroicons/react/24/outline'

export default function StockMedia() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [type, setType] = useState<'photo' | 'video' | 'all'>(
    (searchParams.get('type') as 'photo' | 'video' | 'all') || 'all'
  )
  const [source, setSource] = useState<'pexels' | 'unsplash' | 'pixabay' | 'all'>(
    (searchParams.get('source') as 'pexels' | 'unsplash' | 'pixabay' | 'all') || 'all'
  )
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'square' | ''>(
    (searchParams.get('orientation') as 'landscape' | 'portrait' | 'square') || ''
  )
  const [addingItemId, setAddingItemId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const perPage = 24

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (type !== 'all') params.set('type', type)
    if (source !== 'all') params.set('source', source)
    if (orientation) params.set('orientation', orientation)
    if (page > 1) params.set('page', page.toString())
    setSearchParams(params, { replace: true })
  }, [searchQuery, type, source, orientation, page, setSearchParams])

  // Search params
  const searchParams_obj: StockMediaSearchParams = {
    query: searchQuery || 'nature', // Default query if empty
    type,
    source,
    orientation: orientation || undefined,
    page,
    perPage,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['stock-media', searchParams_obj],
    queryFn: () => stockMediaApi.search(searchParams_obj),
    enabled: !!searchQuery.trim(), // Only search if query is provided
  })

  const addToGalleryMutation = useMutation({
    mutationFn: async (item: StockMediaItem) => {
      setAddingItemId(item.id)
      try {
        await stockMediaApi.downloadAndAddToGallery(item)
      } finally {
        setAddingItemId(null)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
    onError: (error: any) => {
      console.error('Failed to add to gallery:', error)
      alert(error.response?.data?.error || 'Failed to add to gallery')
      setAddingItemId(null)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchParams({ q: searchQuery }, { replace: true })
  }

  const handleItemView = (item: StockMediaItem) => {
    const index = data?.items.findIndex((i) => i.id === item.id) ?? -1
    if (index >= 0) {
      setSelectedItemIndex(index)
      setLightboxOpen(true)
    }
  }

  const handleAddToGallery = (item: StockMediaItem) => {
    addToGalleryMutation.mutate(item)
  }

  const handleCloseLightbox = () => {
    setLightboxOpen(false)
    setSelectedItemIndex(null)
  }

  const handleNextPage = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', String(page + 1))
    setSearchParams(newParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePreviousPage = () => {
    if (page > 1) {
      const newParams = new URLSearchParams(searchParams)
      if (page === 2) {
        newParams.delete('page')
      } else {
        newParams.set('page', String(page - 1))
      }
      setSearchParams(newParams)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Stock Media</h2>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2 items-center">
            <div className="w-80">
              <Input
                type="text"
                placeholder="Search photos and videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" variant="primary">
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Search
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'photo' | 'video' | 'all')}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'photo', label: 'Photos' },
                    { value: 'video', label: 'Videos' },
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as 'pexels' | 'unsplash' | 'pixabay' | 'all')}
                  options={[
                    { value: 'all', label: 'All Sources' },
                    { value: 'pexels', label: 'Pexels' },
                    { value: 'unsplash', label: 'Unsplash' },
                    { value: 'pixabay', label: 'Pixabay' },
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Orientation"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait' | 'square' | '')}
                  options={[
                    { value: '', label: 'Any' },
                    { value: 'landscape', label: 'Landscape' },
                    { value: 'portrait', label: 'Portrait' },
                    { value: 'square', label: 'Square' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Source Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={source === 'all' ? 'primary' : 'secondary'}
            onClick={() => setSource('all')}
            className="text-sm"
          >
            All
          </Button>
          <Button
            variant={source === 'pexels' ? 'primary' : 'secondary'}
            onClick={() => setSource('pexels')}
            className="text-sm"
          >
            Pexels
          </Button>
          <Button
            variant={source === 'unsplash' ? 'primary' : 'secondary'}
            onClick={() => setSource('unsplash')}
            className="text-sm"
          >
            Unsplash
          </Button>
          <Button
            variant={source === 'pixabay' ? 'primary' : 'secondary'}
            onClick={() => setSource('pixabay')}
            className="text-sm"
          >
            Pixabay
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 text-red-600">
          <p className="text-lg">Error loading results</p>
          <p className="text-sm mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && data && (
        <>
          {data.items.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              Found: {data.total} results
            </div>
          )}
          <StockMediaGrid
            items={data.items}
            onItemView={handleItemView}
            onAddToGallery={handleAddToGallery}
            addingItemId={addingItemId}
          />

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page === data.totalPages}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && searchQuery && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-2">Try adjusting your search parameters</p>
        </div>
      )}

      {/* Initial State - No Search Query */}
      {!isLoading && !error && !searchQuery.trim() && (
        <div className="text-center py-12 text-gray-500">
          <FilmIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Start searching stock media</p>
          <p className="text-sm mt-2">Enter your search query in the field above</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && selectedItemIndex !== null && data && data.items.length > 0 && (
        <StockMediaLightbox
          items={data.items}
          currentIndex={selectedItemIndex}
          onClose={handleCloseLightbox}
          onAddToGallery={handleAddToGallery}
          isAdding={addingItemId === data.items[selectedItemIndex]?.id}
        />
      )}
    </div>
  )
}

