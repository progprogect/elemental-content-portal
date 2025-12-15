import { useState } from 'react'
import { Squares2X2Icon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { GalleryItem as GalleryItemType } from '../services/api/gallery'
import GalleryItem from './GalleryItem'
import Button from './ui/Button'

interface GalleryGridProps {
  items: GalleryItemType[]
  onItemView: (item: GalleryItemType) => void
  onItemDelete?: (item: GalleryItemType) => void
  onItemDownload?: (item: GalleryItemType) => void
}

type ViewMode = 'uniform' | 'masonry'

export default function GalleryGrid({
  items,
  onItemView,
  onItemDelete,
  onItemDownload,
}: GalleryGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('uniform')

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No items found</p>
        <p className="text-sm mt-2">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <Button
          variant={viewMode === 'uniform' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('uniform')}
          className="text-sm px-3 py-1.5"
          title="Uniform Grid"
        >
          <Squares2X2Icon className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'masonry' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('masonry')}
          className="text-sm px-3 py-1.5"
          title="Masonry Grid"
        >
          <ViewColumnsIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid Container */}
      {viewMode === 'uniform' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <GalleryItem
              key={item.id}
              item={item}
              onView={onItemView}
              onDelete={onItemDelete}
              onDownload={onItemDownload}
            />
          ))}
        </div>
      ) : (
        <div
          className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4"
          style={{ columnFill: 'balance' }}
        >
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid mb-4">
              <GalleryItem
                item={item}
                onView={onItemView}
                onDelete={onItemDelete}
                onDownload={onItemDownload}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

