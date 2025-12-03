import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tableColumnsApi, TableColumn } from '../services/api/tasks'
import { PlusIcon } from '@heroicons/react/24/outline'
import Button from './ui/Button'
import Modal from './ui/Modal'
import FieldEditor from './FieldEditor'

interface TableColumnManagerProps {
  onColumnChange?: () => void
}

export default function TableColumnManager({ onColumnChange }: TableColumnManagerProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingColumn, setEditingColumn] = useState<TableColumn | undefined>()
  const [deleteConfirmColumn, setDeleteConfirmColumn] = useState<TableColumn | null>(null)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: tableColumnsApi.deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-columns'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDeleteConfirmColumn(null)
      onColumnChange?.()
    },
  })

  const handleCreateColumn = () => {
    setEditingColumn(undefined)
    setIsEditorOpen(true)
  }

  const confirmDelete = () => {
    if (deleteConfirmColumn) {
      deleteMutation.mutate(deleteConfirmColumn.id)
    }
  }

  const handleSaveColumn = async (fieldData: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue: any
  }) => {
    if (editingColumn) {
      await tableColumnsApi.updateColumn(editingColumn.id, {
        fieldName: fieldData.fieldName,
        fieldType: fieldData.fieldType,
        defaultValue: fieldData.fieldValue,
      })
    } else {
      await tableColumnsApi.createColumn({
        fieldName: fieldData.fieldName,
        fieldType: fieldData.fieldType,
        defaultValue: fieldData.fieldValue,
      })
    }
    queryClient.invalidateQueries({ queryKey: ['table-columns'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    setIsEditorOpen(false)
    setEditingColumn(undefined)
    onColumnChange?.()
  }

  return (
    <>
      {/* Add Column Button Header */}
      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 min-w-[200px] border-r border-gray-200">
        <button
          onClick={handleCreateColumn}
          className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add Column
        </button>
      </th>

      {/* Column Editor Modal */}
      <FieldEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingColumn(undefined)
        }}
        onSave={handleSaveColumn}
        field={editingColumn ? {
          id: editingColumn.id,
          fieldName: editingColumn.fieldName,
          fieldType: editingColumn.fieldType,
          fieldValue: editingColumn.defaultValue || (editingColumn.fieldType === 'checkbox' ? { checked: false } : { value: '' }),
          orderIndex: editingColumn.orderIndex,
          taskId: '',
          createdAt: '',
        } : undefined}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmColumn}
        onClose={() => setDeleteConfirmColumn(null)}
        title="Удалить колонку?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmColumn(null)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="ml-3"
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Вы уверены, что хотите удалить колонку <strong>"{deleteConfirmColumn?.fieldName}"</strong>?
        </p>
        <p className="text-sm text-red-600 mt-2">
          Внимание: Все значения этой колонки будут удалены у всех задач.
        </p>
      </Modal>
    </>
  )
}

