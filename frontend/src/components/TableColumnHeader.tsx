import { useState, useRef, useEffect } from 'react'
import { TableColumn } from '../services/api/tasks'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

interface TableColumnHeaderProps {
  column: TableColumn
  onEdit: (column: TableColumn) => void
  onDelete: (column: TableColumn) => void
}

export default function TableColumnHeader({ column, onEdit, onDelete }: TableColumnHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 relative group min-w-[200px] max-w-[400px] border-r border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {column.icon && <span>{column.icon}</span>}
          <span className="truncate">{column.fieldName}</span>
        </div>
        <div className="relative ml-2" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
            className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Column options"
          >
            <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
          </button>
          {isMenuOpen && (
            <div
              className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onEdit(column)
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => {
                    onDelete(column)
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </th>
  )
}


