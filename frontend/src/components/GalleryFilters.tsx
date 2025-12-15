import { useSearchParams } from 'react-router-dom'
import { GalleryFilters as GalleryFiltersType } from '../services/api/gallery'
import Button from './ui/Button'
import Select from './ui/Select'

interface GalleryFiltersProps {
  onFiltersChange?: (filters: GalleryFiltersType) => void
}

export default function GalleryFilters({ onFiltersChange }: GalleryFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Получаем текущие фильтры из URL
  const currentType = (searchParams.get('type') || 'all') as 'all' | 'image' | 'video'
  const currentSource = (searchParams.get('source') || 'all') as 'all' | 'manual' | 'haygen' | 'nanobanana'
  const currentSort = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'task'

  const updateFilters = (updates: Partial<GalleryFiltersType>) => {
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === 'all' || value === 'newest') {
        newParams.delete(key)
      } else {
        newParams.set(key, String(value))
      }
    })

    // Сбрасываем страницу при изменении фильтров
    newParams.delete('page')
    
    setSearchParams(newParams)

    // Вызываем callback с новыми фильтрами
    if (onFiltersChange) {
      const filters: GalleryFiltersType = {
        type: (newParams.get('type') || 'all') as 'all' | 'image' | 'video',
        source: (newParams.get('source') || 'all') as 'all' | 'manual' | 'haygen' | 'nanobanana',
        sort: (newParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'task',
        taskId: newParams.get('taskId') || undefined,
        publicationId: newParams.get('publicationId') || undefined,
        dateFrom: newParams.get('dateFrom') || undefined,
        dateTo: newParams.get('dateTo') || undefined,
        page: newParams.get('page') ? parseInt(newParams.get('page')!, 10) : undefined,
        limit: newParams.get('limit') ? parseInt(newParams.get('limit')!, 10) : undefined,
      }
      onFiltersChange(filters)
    }
  }

  const handleTypeFilter = (type: 'all' | 'image' | 'video') => {
    updateFilters({ type })
  }

  const handleSourceFilter = (source: string) => {
    updateFilters({ source: source as 'all' | 'manual' | 'haygen' | 'nanobanana' })
  }

  const handleSortChange = (sort: string) => {
    updateFilters({ sort: sort as 'newest' | 'oldest' | 'task' })
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Quick type filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={currentType === 'all' ? 'primary' : 'secondary'}
          onClick={() => handleTypeFilter('all')}
          className="text-sm"
        >
          All
        </Button>
        <Button
          variant={currentType === 'image' ? 'primary' : 'secondary'}
          onClick={() => handleTypeFilter('image')}
          className="text-sm"
        >
          Images
        </Button>
        <Button
          variant={currentType === 'video' ? 'primary' : 'secondary'}
          onClick={() => handleTypeFilter('video')}
          className="text-sm"
        >
          Videos
        </Button>
      </div>

      {/* Source and Sort filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-full sm:w-auto min-w-[200px]">
          <Select
            label="Source"
            value={currentSource}
            onChange={(e) => handleSourceFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Sources' },
              { value: 'manual', label: 'Manual' },
              { value: 'haygen', label: 'Haygen' },
              { value: 'nanobanana', label: 'NanoBanana' },
            ]}
          />
        </div>
        <div className="w-full sm:w-auto min-w-[200px]">
          <Select
            label="Sort by"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'task', label: 'By Task' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

