import { StockMediaItem as StockMediaItemType } from '../services/api/stock-media'
import StockMediaItem from './StockMediaItem'

interface StockMediaGridProps {
  items: StockMediaItemType[]
  onAddToGallery: (item: StockMediaItemType) => void
  addingItemId?: string | null
}

export default function StockMediaGrid({ items, onAddToGallery, addingItemId }: StockMediaGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Ничего не найдено</p>
        <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <StockMediaItem
          key={item.id}
          item={item}
          onAddToGallery={onAddToGallery}
          isAdding={addingItemId === item.id}
        />
      ))}
    </div>
  )
}

