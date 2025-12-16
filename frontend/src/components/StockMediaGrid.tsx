import { StockMediaItem as StockMediaItemType } from '../services/api/stock-media'
import StockMediaItem from './StockMediaItem'

interface StockMediaGridProps {
  items: StockMediaItemType[]
  onItemView: (item: StockMediaItemType) => void
  onAddToGallery: (item: StockMediaItemType) => void
  addingItemId?: string | null
}

export default function StockMediaGrid({ items, onItemView, onAddToGallery, addingItemId }: StockMediaGridProps) {
  if (items.length === 0) {
    return null // Empty state is handled by parent component
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <StockMediaItem
          key={item.id}
          item={item}
          onView={onItemView}
          onAddToGallery={onAddToGallery}
          isAdding={addingItemId === item.id}
        />
      ))}
    </div>
  )
}

